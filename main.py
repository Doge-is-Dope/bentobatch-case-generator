import utils.data_utils
from web3_utils.erc20_utils import ERC20Utils


if __name__ == "__main__":

    web3_utils = ERC20Utils()
    print(f"Web3 provider: {web3_utils.provider}")

    account_addr = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"  # vitalik.eth
    token_addr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"  # USDC
    receiver_addr = "0x9fD042a18E90Ce326073fA70F111DC9D798D9a52"  # test account
    amount = 1000000

    result = web3_utils.validate_erc20_transfer(
        token=token_addr, account=account_addr, recipient=receiver_addr, amount=amount
    )
    print(f"Validation result: {result}")
