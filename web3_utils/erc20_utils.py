import os
from dotenv import load_dotenv
from eth_typing import ChecksumAddress
from web3 import Web3

from model.erc20_token import Erc20Token
from utils import data_utils

ERC20 = "erc20"


class ERC20Utils:

    def __init__(self, chain_id: int = 1):
        load_dotenv()
        self.data_utils = data_utils.DataUtils()
        network = self.data_utils.get_network_info_by_id(chain_id)
        if network is None:
            raise ValueError(f"Unsupported chain id: {chain_id}")
        api_key = os.getenv("INFURA_API_KEY")
        provider = Web3.HTTPProvider(network.rpc_url.format(infura_api_key=api_key))
        self.provider = provider
        self.w3 = Web3(provider)

    def __get_contract_instance(self, contract_name: str, contract_address: str):
        """
        Get contract instance
        """
        file_path = f"data/abi/{contract_name}.json"
        with open(file_path, "r") as file:
            abi = file.read()
        contract_address = self.w3.to_checksum_address(contract_address)
        return self.w3.eth.contract(address=contract_address, abi=abi)

    def get_token_info(self, token: str) -> Erc20Token:
        """
        Get token information
        """
        contract = self.__get_contract_instance(ERC20, token)
        name = contract.functions.name().call()
        symbol = contract.functions.symbol().call()
        decimals = contract.functions.decimals().call()
        return Erc20Token(
            contract_addr=token, name=name, symbol=symbol, decimals=decimals
        )

    def encode_erc20_transfer(
        self, contract_addr: str, recipient: str | ChecksumAddress, amount: int
    ) -> str:
        """
        Encode data for ERC20 transfer
        """
        if not self.w3.is_address(contract_addr):
            raise ValueError(f"Invalid contract address: {contract_addr}")
        if not self.w3.is_address(recipient):
            raise ValueError(f"Invalid recipient address: {recipient}")

        contract = self.__get_contract_instance(ERC20, contract_addr)
        return contract.encode_abi(fn_name="transfer", args=[recipient, amount])
