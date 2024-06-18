import ast
import pandas as pd
import numpy as np
from .embeddings_utils import get_embedding, cosine_similarity


class ProtocolSearcher:

    EMBEDDING_MODEL = "text-embedding-3-small"

    def search_protocol(self, query: str) -> dict | None:
        search_result = [
            {"score": score, "id": id, "address": address}
            for score, id, address in self._search_embeddings(query)
        ]

        suggested_protocol = search_result[0]
        other_options = search_result[1:]

        result = dict()
        # For demo, return None if the highest score is less than 0.5
        # The threshold is only used for text-embedding-3-small model and may not be applicable to other models
        if suggested_protocol["score"] < 0.5:
            return None

        result["suggested"] = suggested_protocol
        result["other_options"] = other_options
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
