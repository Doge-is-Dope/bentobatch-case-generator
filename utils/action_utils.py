import json
from web3_utils.ens_utils import resolve_ens
from web3_utils.erc20_utils import ERC20Utils
from .data_utils import DataUtils
from .token_searcher import TokenSearcher


def get_supported_actions() -> dict[str, str]:
    """
    Get supported actions from a json file
    """
    file_path = "data/action.json"
    with open(file_path, "r") as file:
        json_content = json.load(file)
    return {item["action"]: item["description"] for item in json_content}


def evaluate_response(response: str) -> list[str]:
    """
    Evaluate a response from the GPT
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
        match action:
            case "transfer":
                return _get_transfer_action(action_item)
            case _:
                return UnsupportedActionError(
                    error=f"Not yet supported action: {action}"
                ).to_json()
    else:
        return UnsupportedActionError(error=f"Unsupported action: {action}").to_json()


def _shorten_address(receiver: str, n: int = 6) -> str:
    if receiver.startswith("0x"):
        prefix_length = 2  # Length of the prefix '0x'
        # Shorten the address
        shortened_address = receiver[: prefix_length + n] + "..." + receiver[-n:]
        return shortened_address
    else:
        return receiver


def _get_transfer_action(action: dict) -> str:
    try:
        user_chain = action["chain"]  # user input chain
        user_amount = action["amount"]  # user input amount
        user_token = action["token"]  # user input token
        user_receiver = action["receiver"]

        # Resolve the chain
        chain = user_chain.strip()
        network = DataUtils().get_network_info_by_name(chain)
        if network is None:
            return InvalidArgumentError(f"Unsupported chain: {chain.title()}").to_json()
        else:
            chain = network.name

        # Resolve the receiver
        receiver = user_receiver.strip()
        if user_receiver.endswith(".eth"):
            resolved_addr = resolve_ens(user_receiver)
            if resolved_addr is None:
                return InvalidArgumentError(
                    error=f"Invalid recipient: {user_receiver}"
                ).to_json()
            receiver = resolved_addr

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
        description = f"Transfer {user_amount} {token_symbol} to {_shorten_address(receiver)} on {chain.title()}"

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
