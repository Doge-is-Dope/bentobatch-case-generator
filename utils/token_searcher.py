import pandas as pd
import ast
import numpy as np
from .embeddings_utils import get_embedding, cosine_similarity


class TokenSearcher:

    EMBEDDING_MODEL = "text-embedding-3-large"

    def search_token(
        self,
        query: str,
        chain: str | None,
        other_options: bool = False,
    ) -> dict:
        result: dict = {"suggested": {}, "other_options": []}
        chain = chain.lower() if chain is not None else None
        suggested = self._search_token_offline(query, chain)
        if result is not None:
            # Try offline search first
            result["suggested"] = suggested

        if other_options:
            # Try embedding search
            options = self._search_token_embeddings(query, chain)
            # Filter out the suggested token from the other options
            if suggested is not None:
                options = [op for op in options if op["id"] != suggested["id"]]
            result["other_options"] = options
        return result

    def _search_token_offline(self, query: str, chain: str | None) -> dict | None:
        # Load the CSV file
        df = pd.read_csv("processed/embeddings/erc20_tokens.csv")

        # Function to extract contract address for the specified chain
        def get_contract_address(row, chain):
            try:
                contracts = ast.literal_eval(row["network_to_contract"])
                return contracts.get(chain, None)
            except (ValueError, SyntaxError):
                return None

        # Convert query to lowercase for case-insensitive search
        query = query.lower()

        # Filter rows based on name, symbol, or contract address
        filtered_df = df[
            (df["name"].str.lower().str.contains(query))
            | (df["symbol"].str.lower().str.contains(query))
            | (
                df["network_to_contract"].apply(
                    lambda x: query in ast.literal_eval(x).values()
                )
            )
        ]

        if filtered_df.empty:
            return None

        # Select the first result
        first_result = filtered_df.iloc[0]

        # If chain is specified, extract the contract address for that chain
        contract_addr = get_contract_address(first_result, chain)
        if contract_addr is None:
            return None
        else:
            return {
                "id": first_result["id"],
                "name": first_result["name"],
                "symbol": first_result["symbol"],
                "decimals": first_result["decimals"],
                "network": chain,
                "contract_address": contract_addr,
            }

    def _search_token_embeddings(self, query: str, chain: str | None, top_n: int = 5):
        """
        Search for tokens based on the query and return the top_n most similar tokens.
        Parameters:
        query (str): The search query.
        top_n (int): The number of top related tokens to return (default is 5).

        Returns:
        list: A list of dictionaries containing the keys 'score' and 'token_info'.
        """

        df = pd.read_csv("processed/embeddings/erc20_tokens.csv")
        # Filter the DataFrame to include only tokens available on the specified chain
        if chain is not None:
            df = self._filter_by_chain(df, chain)
        # Convert the 'embedding' column to a column of NumPy arrays
        df["embedding"] = df["embedding"].apply(self._convert_to_numpy_array)

        query_embedding = get_embedding(text=query, model=self.EMBEDDING_MODEL)

        tokens = [
            {
                "score": cosine_similarity(query_embedding, row["embedding"]),
                "id": row["id"],
                "name": row["name"],
                "symbol": row["symbol"],
                "decimals": row["decimals"],
                "contracts": [
                    {"chain": chain, "contract_addr": addr}
                    for chain, addr in eval(row["network_to_contract"]).items()
                ],
            }
            for i, row in df.iterrows()
        ]

        tokens.sort(key=lambda x: x["score"], reverse=True)
        results = [token for token in tokens[:top_n]]
        return results

    def _convert_to_numpy_array(self, embedding):
        if isinstance(embedding, str):
            embedding = ast.literal_eval(
                embedding
            )  # Convert string representation of list to actual list
        return np.array(embedding)

    def _filter_by_chain(self, df: pd.DataFrame, filtering_chain: str) -> pd.DataFrame:
        # Function to check if the specified chain is in the network_to_contract field
        def has_chain(network_to_contract, chain):
            try:
                # Convert the string representation of dictionary to an actual dictionary
                network_dict = eval(network_to_contract)
                return chain in network_dict
            except (SyntaxError, NameError):
                return False

        # Filter the DataFrame to include only tokens available on the specified chain
        return df[df["network_to_contract"].apply(has_chain, args=(filtering_chain,))]
