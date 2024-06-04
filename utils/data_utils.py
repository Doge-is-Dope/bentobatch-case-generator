import re
import json


def remove_newlines(serie):
    """
    Remove newlines from a pandas series for better processing.
    """
    serie = serie.str.replace("\n", " ")
    serie = serie.str.replace("\\n", " ")
    serie = serie.str.replace("  ", " ")
    serie = serie.str.replace("  ", " ")
    return serie


def extract_preview_tx(code: str):
    # Regular expression to match the previewTx array
    preview_tx_pattern = re.compile(r"previewTx:\s*\[(.*?)\]", re.DOTALL)

    # Search for the pattern in the TypeScript code
    match = preview_tx_pattern.search(code)

    if match:
        preview_tx_code = match.group(1)
        print("Extracted previewTx code:")
        print(preview_tx_code)
    else:
        print("previewTx array not found in the provided TypeScript code.")
