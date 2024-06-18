import os
from ens import ENS
from web3 import Web3


def is_address(text: str) -> bool:
    """
    Check if a text is an address
    """
    return Web3().is_address(text)


def resolve_ens(domain):
    api_key = os.getenv("INFURA_API_KEY")
    url = "https://mainnet.infura.io/v3/{infura_api_key}".format(infura_api_key=api_key)
    provider = Web3.HTTPProvider(url)
    w3 = Web3(provider)
    ns = ENS.from_web3(w3)
    return ns.address(domain)
