import csv
import os
from .data_utils import DataUtils
from itertools import islice
import os
import pandas as pd
import numpy as np
import requests
import json
from tqdm import tqdm
from .embeddings_utils import get_embeddings
from web3 import Web3


CMC_BASE_URL = "https://pro-api.coinmarketcap.com/v1"
EMBEDDING_MODEL = "text-embedding-3-large"
api_key = os.environ["CMC_API_KEY"]
headers = {"Accepts": "application/json", "X-CMC_PRO_API_KEY": api_key}


def _get_supported_chains():
    network_path = "data/network.json"
    with open(network_path, "r") as file:
        data = json.load(file)
        return {item["name"] for item in data}


def fetch_cmc_map(supported_chains: set[str], top_n: int = 5000) -> list[int]:
    """
    Fetch the CoinMarketCap token map and filter out tokens that are not supported by the given chains.
    Parameters:
    supported_chains (set): A set of chain names to filter out tokens.
    top_n (int): The number of top tokens to fetch (default is 5000).

    Returns:
    set: A set of token ids.
    """
    # Fetch the token map
    url = f"{CMC_BASE_URL}/cryptocurrency/map"
    parameters = {"aux": "platform", "sort": "cmc_rank", "limit": top_n}
    print(f"Fetching token map...", end="", flush=True)
    response = requests.get(url, headers=headers, params=parameters)
    response.raise_for_status()
    data = response.json()["data"]

    ids = set()  # token which are already saved

    # Save the token map to a CSV file
    output_path = "data/cmc/map.csv"
    directory = os.path.dirname(output_path)
    if not os.path.exists(directory):
        os.makedirs(directory)

    with open(output_path, mode="w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["id", "name", "symbol", "decimals"])
        writer.writeheader()

        for item in tqdm(data, desc="Processing tokens"):
            if (
                item["platform"]
                and item["platform"]["name"].lower() in supported_chains
            ):
                chain = item["platform"]["name"].lower().strip()
                token_addr = item["platform"]["token_address"].strip()
                decimals = _get_token_decimals(token_addr, chain)
                if item["id"] in ids:
                    continue
                ids.add(item["id"])
                writer.writerow(
                    {
                        "id": item["id"],
                        "name": item["name"].strip(),
                        "symbol": item["symbol"].strip(),
                        "decimals": decimals,
                    }
                )

    print(f"{len(ids)} tokens saved.")
    return list(ids)


def _get_token_decimals(contract_addr: str, chain_name: str):
    # Get supported network info
    data_utils = DataUtils()
    network = data_utils.get_network_info_by_name(chain_name)

    if network is None:
        raise ValueError(f"Unsupported chain name: {chain_name}")

    # ERC20 ABI
    file_path = f"data/abi/erc20.json"
    with open(file_path, "r") as file:
        abi = file.read()

    api_key = os.getenv("INFURA_API_KEY")
    provider = Web3.HTTPProvider(network.rpc_url.format(infura_api_key=api_key))
    w3 = Web3(provider)
    contract_address = w3.to_checksum_address(contract_addr)
    contract = w3.eth.contract(address=contract_address, abi=abi)
    try:
        return int(contract.functions.decimals().call())
    except Exception as e:
        # Some tokens do not have a decimals function
        return 0


def fetch_cmc_tokens(supported_chains: set[str], chunk_size: int = 100):
    """
    Fetch token info from CoinMarketCap and save it to the token map.
    """

    def chunked_iterable(iterable, size):
        it = iter(iterable)
        while True:
            chunk = tuple(islice(it, size))
            if not chunk:
                break
            yield chunk

    # Load the token map
    token_map_path = "data/cmc/map.csv"
    tokens = pd.read_csv(token_map_path)
    ids = tokens["id"].tolist()

    url = f"{CMC_BASE_URL}/cryptocurrency/info"
    token_info = []
    chunks = list(chunked_iterable(ids, chunk_size))

    for chunk in tqdm(chunks, desc="Fetching token info"):
        parameters = {"id": ",".join(map(str, chunk))}
        response = requests.get(url, headers=headers, params=parameters)
        response.raise_for_status()

        # Parse the response
        data = response.json()["data"]
        for id in chunk:
            crypto = data[str(id)]
            description = crypto["description"]
            network_to_contract = {}
            for ca in crypto["contract_address"]:
                chain = ca["platform"]["name"].lower()
                if chain in supported_chains:
                    network_to_contract[chain] = ca["contract_address"]
            token_info.append(
                {
                    "id": id,
                    "description": description,
                    "network_to_contract": network_to_contract,
                }
            )

    # Update the map.csv with network_to_contract and description
    id_to_contract = {info["id"]: info["network_to_contract"] for info in token_info}
    id_to_description = {info["id"]: info["description"] for info in token_info}

    tokens["network_to_contract"] = tokens["id"].map(id_to_contract)
    tokens["description"] = tokens["id"].map(id_to_description)
    tokens.to_csv(token_map_path, index=False)

    print(f"{len(token_info)} tokens saved.")


def get_token_embeddings():
    """
    Get embeddings for ERC20 tokens.
    """
    tokens = pd.read_csv("data/cmc/map.csv")
    descriptions = tokens["description"].tolist()

    # Split descriptions into batches for better performance
    batch_size = 100
    description_batches = np.array_split(
        descriptions, len(descriptions) // batch_size + 1
    )

    tqdm.pandas(desc="Processing embeddings")

    embeddings = []
    for batch in tqdm(description_batches, desc="Processing embeddings"):
        text_list = batch.tolist()  # Convert NumPy array to list
        batch_embeddings = get_embeddings(list_of_text=text_list, model=EMBEDDING_MODEL)
        embeddings.extend(batch_embeddings)

    tokens["embedding"] = pd.Series(embeddings)

    output_path = "processed/embeddings/erc20_tokens.csv"
    directory = os.path.dirname(output_path)
    if not os.path.exists(directory):
        os.makedirs(directory)

    tokens.to_csv(output_path, index=False)
    print(f"Embeddings saved to {output_path}.")


if __name__ == "__main__":
    # Get supported chains
    chain_names = _get_supported_chains()
    # Fetch CMC crypto map
    ids = fetch_cmc_map(chain_names)
    # Fetch tokens by ids
    fetch_cmc_tokens(chain_names)
    # Get embeddings
    get_token_embeddings()
