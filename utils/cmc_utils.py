import os
import pandas as pd
import requests


CMC_BASE_URL = "https://pro-api.coinmarketcap.com/v1"

api_key = os.environ["CMC_API_KEY"]


def fetch_cmc_tokens(top_n: int = 100):
    url = f"{CMC_BASE_URL}/cryptocurrency/listings/latest"
    parameters = {
        "start": "1",
        "limit": top_n,
        "convert": "USD",
        "cryptocurrency_type": "tokens",
    }
    headers = {"Accepts": "application/json", "X-CMC_PRO_API_KEY": api_key}
    response = requests.get(url, headers=headers, params=parameters)
    response.raise_for_status()
    return response.json().get("data")


def save_to_csv(
    data: list[dict], output_path: str = "data/embeddings/erc20_tokens.csv"
):
    extracted_data = []
    for item in data:
        contract_address = (
            item["platform"]["token_address"] if item["platform"] else "N/A"
        )
        name = item["name"]
        symbol = item["symbol"]
        decimals = item["platform"]["symbol"] if item["platform"] else "N/A"
        slug = item["slug"]
        current_price = item["quote"]["USD"]["price"]
        circulating_supply = item["circulating_supply"]
        market_cap = item["quote"]["USD"]["market_cap"]
        tags = ", ".join(item["tags"]) if item["tags"] else "N/A"

        extracted_data.append(
            {
                "contract_address": contract_address,
                "name": name,
                "symbol": symbol,
                "decimals": decimals,
                "slug": slug,
                "current_price": current_price,
                "circulating_supply": circulating_supply,
                "market_cap": market_cap,
                "tags": tags,
            }
        )

    directory = os.path.dirname(output_path)
    if not os.path.exists(directory):
        os.makedirs(directory)
    pd.DataFrame(extracted_data).to_csv(output_path, index=False)


if __name__ == "__main__":
    # Fetch top 1000 tokens
    response = fetch_cmc_tokens(top_n=1000)
    # Save to CSV
    save_to_csv(response)
