import json

from model.network import Network
from web3_utils.ens_utils import resolve_ens, is_address
from web3_utils.erc20_utils import ERC20Utils
from .data_utils import DataUtils
from .token_searcher import TokenSearcher
from .protocol_searcher import ProtocolSearcher


def get_supported_actions() -> dict[str, str]:
    """
    Get supported actions from a json file
    """
    file_path = "data/action.json"
    with open(file_path, "r") as file:
        json_content = json.load(file)
    return {item["name"]: item["description"] for item in json_content}


def evaluate_response(response: str) -> list[str]:
    """
    Evaluate a generated response
    """
    actions = json.loads(response)
    results = []
    for action_item in actions:
        results.append(evaluate_action(action_item))
    return results


def evaluate_action(action_item: dict) -> str:
    """
    Evaluate an action item
    """
    supported_actions = get_supported_actions()
    action = action_item["action"]
    if action in supported_actions:
        description = supported_actions[action]
        match action:
            case "transfer":
                return _get_transfer_action(action_item, description)
            case "approve":
                return _get_approve_action(action_item, description)
            case _:
                return UnsupportedActionError(
                    error=f"Not yet supported action: {action}"
                ).to_json()
    else:
        return UnsupportedActionError(error=f"Unsupported action: {action}").to_json()


def _shorten_address(address: str, n: int = 6) -> str:
    if address.startswith("0x"):
        prefix_length = 2  # Length of the prefix '0x'
        # Shorten the address
        shortened_address = address[: prefix_length + n] + "..." + address[-n:]
        return shortened_address
    else:
        return address


def _get_transfer_action(action: dict, desc: str) -> str:
    try:
        user_chain = action["chain"]  # user input chain
        user_amount = action["amount"]  # user input amount
        user_token = action["token"]  # user input token
        user_receiver = action["receiver"]

        # Resolve the chain
        network = _resolve_chain(user_chain)
        if network is None:
            return InvalidArgumentError(f"Unsupported chain: {user_chain}").to_json()
        else:
            chain = network.name

        # Resolve the receiver
        receiver = _resolve_receiver(user_receiver, "transfer", user_token, chain)
        if receiver is None:
            return InvalidArgumentError(
                error=f"Invalid recipient: {user_receiver}"
            ).to_json()

        # Resolve the token
        token_searcher = TokenSearcher()
        search_result = token_searcher.search_token(user_token, chain)
        suggested_token = search_result["suggested"]
        optional_tokens = search_result["other_options"]
        optional_token_symbols = [token["symbol"] for token in optional_tokens]
        if suggested_token is None:
            if len(optional_token_symbols) != 0:
                return TokenNotFoundError(
                    f"{user_token} is not found. Try the following: {optional_token_symbols}"
                ).to_json()
            else:
                return TokenNotFoundError(
                    f"{user_token} is not found on {chain.title()}."
                ).to_json()

        assert suggested_token is not None
        token_symbol = suggested_token["symbol"]
        token_decimals = int(suggested_token["decimals"])
        token_addr = suggested_token["contract_address"]
        token_amount = int(float(user_amount) * 10**token_decimals)
        description = desc.format(
            amount=user_amount,
            token=token_symbol,
            receiver=_shorten_address(receiver),
            chain=chain.title(),
        )

        # If the token address is None, it is a native token
        if token_addr is None:
            return ActionResponse(
                action="transfer",
                description=description,
                chain=chain,
                to=receiver,
                value=str(token_amount),
                data="0x",
            ).to_json()
        else:
            # Resolve the data
            token_utils = ERC20Utils()
            data = token_utils.encode_erc20_transfer(token_addr, receiver, token_amount)

            return ActionResponse(
                action="transfer",
                description=description,
                chain=chain,
                to=token_addr,
                value="0",
                data=data,
            ).to_json()

    except Exception as e:
        return InvalidArgumentError(error=str(e)).to_json()


def _get_approve_action(action: dict, desc: str) -> str:
    try:
        user_chain = action["chain"]  # user input chain
        user_amount = action["amount"]  # user input amount
        user_token = action["token"]  # user input token
        user_spender = action["spender"]

        # Resolve the chain
        network = _resolve_chain(user_chain)
        if network is None:
            return InvalidArgumentError(f"Unsupported chain: {user_chain}").to_json()
        else:
            chain = network.name

        # Resolve the spender
        spender = _resolve_receiver(user_spender, "approve", user_token, chain)
        if spender is None:
            return InvalidArgumentError(
                error=f"Invalid spender: {user_spender}"
            ).to_json()

        # Resolve the token
        token_searcher = TokenSearcher()
        search_result = token_searcher.search_token(user_token, chain)
        suggested_token = search_result["suggested"]
        optional_tokens = search_result["other_options"]
        optional_token_symbols = [token["symbol"] for token in optional_tokens]
        if suggested_token is None:
            if len(optional_token_symbols) != 0:
                return TokenNotFoundError(
                    f"{user_token} is not found. Try the following: {optional_token_symbols}"
                ).to_json()
            else:
                return TokenNotFoundError(
                    f"{user_token} is not found on {chain.title()}."
                ).to_json()

        assert suggested_token is not None
        token_symbol = suggested_token["symbol"]
        token_decimals = int(suggested_token["decimals"])
        token_addr = suggested_token["contract_address"]
        token_amount = int(float(user_amount) * 10**token_decimals)
        description = desc.format(
            amount=user_amount,
            token=token_symbol,
            spender=_shorten_address(spender),
            chain=chain.title(),
        )

        # If the token address is None, it is a native token
        if token_addr is None:
            return UnsupportedActionError(
                error=f"Approve action is not supported for native tokens: {token_symbol}"
            ).to_json()
        else:
            # Resolve the data
            token_utils = ERC20Utils()
            data = token_utils.encode_erc20_approve(token_addr, spender, token_amount)

            return ActionResponse(
                action="approve",
                description=description,
                chain=chain,
                to=token_addr,
                value="0",
                data=data,
            ).to_json()

    except Exception as e:
        return InvalidArgumentError(error=str(e)).to_json()


def _resolve_chain(text: str) -> Network | None:
    """
    Resolve the user input chain
    Return the network info if the chain is supported; otherwise, return None
    """
    chain = text.strip()
    return DataUtils().get_network_info_by_name(chain)


def _resolve_receiver(raw_text: str, action: str, token: str, chain: str) -> str | None:
    """
    Resolve the receiver address
    Parameters:
        raw_text: str - The raw text of the receiver. e.g. "0x1234...5678", "alice.eth" or "AAVE"
        action: str - The action type
        token: str - The token symbol
        chain: str - The chain name
    Return:
        the address if it is valid; otherwise, return None
    """
    text = raw_text.strip()
    if text.endswith(".eth"):
        resolved_addr = resolve_ens(text)
        return resolved_addr
    else:
        if is_address(text):
            return text
        else:
            return _resolve_protocol(action, token, chain)


def _resolve_protocol(action: str, token: str, chain: str):
    result = ProtocolSearcher().search_protocol(query=f"{action}, {token}, {chain}")
    if result is None:
        return None
    print("Protocols: ", result)
    # Return the suggested protocol's address
    return result["suggested"]["address"]


class _ActionError:
    def __init__(self, error: str | None = None):
        self.type = self.__class__.__name__
        self.error = error

    def to_json(self) -> str:
        return json.dumps({"type": self.type, "error": self.error})


class InvalidArgumentError(_ActionError):
    def __init__(self, error: str | None = None):
        super().__init__(error)


class UnsupportedActionError(_ActionError):
    def __init__(self, error: str | None = None):
        super().__init__(error)


class TokenNotFoundError(_ActionError):
    def __init__(self, error: str | None = None):
        super().__init__(error)


class ActionResponse:
    def __init__(
        self,
        action: str,
        description: str,
        chain: str,
        to: str,
        value: str,
        data: str,
    ):
        self.action = action
        self.description = description
        self.chain = chain
        self.to = to
        self.value = value
        self.data = data

    def __str__(self):
        attributes = [
            f"action: {self.action}",
            f"description: {self.description}",
            f"chain: {self.chain}",
            f"to: {self.to}",
            f"value: {self.value}",
            f"data: {self.data}",
        ]
        return "\n".join(attr for attr in attributes if attr is not None)

    def to_json(self) -> str:
        data = {
            "action": self.action,
            "description": self.description,
            "chain": self.chain,
            "to": self.to,
            "value": self.value,
            "data": self.data,
        }
        return json.dumps(data)
