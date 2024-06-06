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


def read_constants():
    """
    Read constants as additional data
    """
    data = {}
    with open("data/networks.csv", "r") as f:
        data["networks"] = f.read()
    with open("data/tokens.csv", "r") as f:
        data["tokens"] = f.read()
    return data
