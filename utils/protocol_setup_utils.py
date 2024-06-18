import os
import csv
import json
from matplotlib.pyplot import get
import pandas as pd
from openai import OpenAI
from .embeddings_utils import get_embeddings

EMBEDDING_MODEL = "text-embedding-3-small"
# EMBEDDING_MODEL = "text-embedding-ada-002"
RAW_DATA_INPUT_PATH = "data/protocol.json"
EMBEDDINGS_OUTPUT_PATH = "processed/embeddings/protocol.csv"

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def json_to_csv(json_file_path, csv_file_path):
    with open(json_file_path, "r") as json_file:
        data = json.load(json_file)

    with open(csv_file_path, "w", newline="") as csv_file:
        csv_writer = csv.writer(csv_file)

        # Write the header row
        header = list(data[0].keys()) + ["text"]
        csv_writer.writerow(header)

        # Write the data rows
        for item in data:
            text = ", ".join(str(value) for value in item.values())
            row = list(item.values()) + [text]
            csv_writer.writerow(row)


def remove_newlines(serie):
    """
    Remove newlines from a pandas series for better processing.
    """
    serie = serie.str.replace("\n", " ")
    serie = serie.str.replace("\\n", " ")
    serie = serie.str.replace("  ", " ")
    serie = serie.str.replace("  ", " ")
    return serie


if __name__ == "__main__":
    # Load the data
    json_to_csv(RAW_DATA_INPUT_PATH, EMBEDDINGS_OUTPUT_PATH)
    df = pd.read_csv(EMBEDDINGS_OUTPUT_PATH)

    # Create embeddings
    df["text"] = remove_newlines(df["text"])
    text_list = df["text"].tolist()
    print("Getting embeddings...", end="", flush=True)
    df["embedding"] = get_embeddings(text_list, model=EMBEDDING_MODEL)
    # Save the embeddings
    df.to_csv(EMBEDDINGS_OUTPUT_PATH)
    print("Done. Saved to", EMBEDDINGS_OUTPUT_PATH)
