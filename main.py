import json
import re
from web3_utils.erc20_utils import ERC20Utils


if __name__ == "__main__":

    web3_utils = ERC20Utils()
    print(f"Web3 provider: {web3_utils.provider}")
    # Response from the parser
    raw_json = """
            [
                {
                    "action":"transfer",
                    "chain":"Ethereum",
                    "amount":"10",
                    "token":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    "receiver":"vitalik.eth"
                }
            ]
    """
    json_obj = json.loads(raw_json)
    # Mock sender address
    sender_addr = "0xa1710f0528e83a6c6c72ac45930Fd08f6E11801b"  # test
    # From the json object
    action = json_obj[0]["action"]
    chain = json_obj[0]["chain"].lower()
    amount = int(json_obj[0]["amount"])
    receiver = json_obj[0]["receiver"]

    # Get the token address

    # result = web3_utils.encode_erc20_transfer(
    #     contract_addr=,
    #     recipient=receiver,
    #     amount=10,
    # )
    # print(f"Encoded transfer: {result}")

    # web3_utils = ERC20Utils()
    # print(f"Web3 provider: {web3_utils.provider}")

    # token_info = web3_utils.get_token_info(token_addr)
    # print(f"Token info: {token_info}")

    # result = web3_utils.validate_erc20_transfer(
    #     token=token_addr, account=account_addr, recipient=receiver_addr, amount=amount
    # )
    # print(f"Validation result: {result}")
