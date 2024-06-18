import os
import glob
import json
import re
import random
import shutil
from typing import Tuple
from datetime import datetime
from openai import OpenAI


OUTPUT_PATH = "processed/fine-tuning"

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def _get_fine_tuning_files(directory: str) -> list[str]:
    return [path for path in glob.glob(os.path.join(directory, "*.json"))]


def _remove_files(directory):
    # List all files in the directory
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)

        try:
            # Check if it is a file and remove it
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            # Check if it is a directory and remove it
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            print(f"Failed to delete {file_path}. Reason: {e}")


def prepare_fine_tuning_files(raw_data_path: str, exclude_data: list[str] = []):
    """
    Transform the fine-tuning data from multiple files into a single JSONL file.
    """
    files = _get_fine_tuning_files(raw_data_path)
    print(f"Found {len(files)} .json files for processing.")

    jsonl_data = []
    for file_path in files:
        basename = os.path.basename(file_path)
        if basename in exclude_data:
            continue
        with open(file_path, "r") as file:
            data = json.load(file)

        # Transform the data into the desired JSONL format
        for entry in data:
            jsonl_entry = {
                "messages": [
                    {
                        "role": "system",
                        "content": "You will be presented with a user intent, and your task is to extract the useful information and output it in JSON format.",
                    },
                    {"role": "user", "content": entry["prompt"]},
                    {"role": "assistant", "content": json.dumps(entry["completion"])},
                ]
            }
            jsonl_data.append(json.dumps(jsonl_entry))

    # Create the output directory if it does not exist
    if not os.path.exists(OUTPUT_PATH):
        os.makedirs(OUTPUT_PATH)

    # Remove all files in the output directory
    _remove_files(OUTPUT_PATH)

    # Create the output file name with the current date
    current_date = datetime.now().strftime("%m%d")
    output_path = "{purpose}-{date}.jsonl"
    training_output_path = os.path.join(
        OUTPUT_PATH,
        output_path.format(purpose="training", date=current_date),
    )
    validation_output_path = os.path.join(
        OUTPUT_PATH,
        output_path.format(purpose="validation", date=current_date),
    )

    # Write the training data
    with open(training_output_path, "w") as output_file:
        for line in jsonl_data:
            output_file.write(line + "\n")

    # Write the sampled training data for validation
    with open(validation_output_path, "w") as output_file:
        random.shuffle(jsonl_data)
        for line in jsonl_data[30:100]:
            output_file.write(line + "\n")


def upload_fine_tuning_files() -> Tuple[str, str]:
    """
    Upload the processed fine-tuning files to the OpenAI server.
    Returns a list of the uploaded file IDs.
    """
    file_patterns = ["training-*.jsonl", "validation-*.jsonl"]
    file_ids = {}
    for pattern in file_patterns:
        files = glob.glob(os.path.join(OUTPUT_PATH, pattern))
        if files:
            for file_path in files:
                file_name = os.path.basename(file_path)
                if re.match(r"training-\d{4}\.jsonl", file_name):
                    response = client.files.create(
                        file=open(file_path, "rb"), purpose="fine-tune"
                    )
                    file_ids["training"] = response.id
                elif re.match(r"validation-\d{4}\.jsonl", file_name):
                    response = client.files.create(
                        file=open(file_path, "rb"), purpose="fine-tune"
                    )
                    file_ids["validation"] = response.id

    if "training" not in file_ids or "validation" not in file_ids:
        raise FileNotFoundError("No training or validation files found.")

    return (file_ids["training"], file_ids["validation"])


def start_fine_tuning(training_file_id: str, validation_file_id) -> str:
    """
    Start the fine-tuning process using the uploaded file IDs.
    """
    response = client.fine_tuning.jobs.create(
        training_file=training_file_id,
        validation_file=validation_file_id,
        model="gpt-3.5-turbo",
    )
    return response.id


if __name__ == "__main__":
    directory = "data/fine-tuning"
    prepare_fine_tuning_files(directory, exclude_data=["swap_0613.json"])
    print("Fine-tuning files prepared.")

    # Upload the processed files
    training_file_id, validation_file_id = upload_fine_tuning_files()
    print("Fine-tuning files uploaded.")

    # Start the fine-tuning process
    job_id = start_fine_tuning(training_file_id, validation_file_id)
    print(f"Fine-tuning started with ID: {job_id}")
