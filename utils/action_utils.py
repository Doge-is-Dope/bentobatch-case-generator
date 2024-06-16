import json
from unittest import result
from web3_utils.ens_utils import resolve_ens
from web3_utils.erc20_utils import ERC20Utils
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
        chain = action["chain"]
        user_amount = action["amount"]  # user input amount
        user_token = action["token"]  # user input token
        receiver = action["receiver"]

        # Resolve the receiver
        if receiver.endswith(".eth"):
            resolved_addr = resolve_ens(receiver)
            if resolved_addr is None:
                return InvalidArgumentError(
                    error=f"Invalid recipient: {receiver}"
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
                    f"{user_token} is not found on {chain}."
                ).to_json()

        assert suggested_token is not None

        token_symbol = suggested_token["symbol"]
        token_decimals = int(suggested_token["decimals"])
        amount = int(float(user_amount) * 10**token_decimals)
        contract_address = suggested_token["contract_address"]

        # Resolve the data
        token_utils = ERC20Utils()
        data = token_utils.encode_erc20_transfer(contract_address, receiver, amount)

        response = ActionResponse(
            description=f"Transfer {user_amount} {token_symbol} to {_shorten_address(receiver)} on {chain}",
            to=contract_address,
            value="0",
            data=data,
        )

        return response.to_json()
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
        description: str | None = None,
        to: str | None = None,
        value: str | None = None,
        data: str | None = None,
    ):
        self.description = description
        self.to = to
        self.value = value
        self.data = data

    def __str__(self):
        attributes = [
            f"description: {self.description}",
            f"to: {self.to}" if self.to is not None else None,
            f"value: {self.value}" if self.value is not None else None,
            f"data: {self.data}" if self.data is not None else None,
        ]
        return "\n".join(attr for attr in attributes if attr is not None)

    def to_json(self) -> str:
        data = {
            "description": self.description,
            "to": self.to,
            "value": self.value,
            "data": self.data,
        }
        return json.dumps(data)
