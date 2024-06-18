import ast
import pandas as pd
import numpy as np
from .embeddings_utils import get_embedding, cosine_similarity


class ProtocolSearcher:

    EMBEDDING_MODEL = "text-embedding-3-small"

    def search_protocol(
        self,
        protocol: str,
        chain: str | None,
        other_options: bool = False,
    ) -> dict:
        result: dict = {"suggested": {}, "other_options": []}
        chain = chain.lower() if chain is not None else None

        search_result = [
            {"score": score, "id": id, "address": address}
            for score, id, address in self._search_embeddings(f"{protocol}, {chain}")
        ]

        result["suggested"] = search_result[0]
        result["other_options"] = search_result[1:]

        return result

    def _search_embeddings(self, query):
        top_n = 5
        df = pd.read_csv("processed/embeddings/protocol.csv")
        # Convert the 'embedding' column to a column of NumPy arrays
        df["embedding"] = df["embedding"].apply(self._convert_to_numpy_array)

        query_embedding = get_embedding(text=query, model=self.EMBEDDING_MODEL)

        def calculate_similarity(row):
            return (
                cosine_similarity(query_embedding, row["embedding"]),
                row["id"],
                row["address"],
            )

        protocol_to_score_list = [calculate_similarity(row) for _, row in df.iterrows()]
        protocol_to_score_list.sort(key=lambda x: x[0], reverse=True)
        top_cases = protocol_to_score_list[:top_n]
        return top_cases

    def _convert_to_numpy_array(self, embedding):
        if isinstance(embedding, str):
            embedding = ast.literal_eval(
                embedding
            )  # Convert string representation of list to actual list
        return np.array(embedding)
