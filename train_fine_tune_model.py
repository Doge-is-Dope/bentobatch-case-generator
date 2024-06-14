import glob
import json
from openai import OpenAI
import os


OUTPUT_PATH = "processed/fine-tuning"

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def get_fine_tuning_files(directory: str) -> list[str]:
    return [path for path in glob.glob(os.path.join(directory, "*.json"))]


def process_fine_tuning(file_path: str):
    """
    Transform the fine-tuning data into the desired JSONL format for training.
    """
    with open(file_path, "r") as file:
        data = json.load(file)

    # Transform the data into the desired JSONL format
    jsonl_data = []
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
    # Create the output file name
    filename_without_suffix = os.path.basename(file_path).removesuffix(".json")
    #  Create the output directory if it does not exist
    if not os.path.exists(OUTPUT_PATH):
        os.makedirs(OUTPUT_PATH)
    output_file_path = f"{OUTPUT_PATH}/{filename_without_suffix}.jsonl"
    # Write the processed data to a JSONL file
    with open(output_file_path, "w") as output_file:
        for line in jsonl_data:
            output_file.write(line + "\n")


def upload_fine_tuning_files() -> list[str]:
    """
    Upload the processed fine-tuning files to the OpenAI server.
    Returns a list of the uploaded file IDs.
    """

    uploaded_files = []
    for path in glob.glob(os.path.join(OUTPUT_PATH, "*.jsonl")):
        response = client.files.create(file=open(path, "rb"), purpose="fine-tune")
        uploaded_files.append(response.id)
    return uploaded_files


def start_fine_tuning(file_ids: list[str]) -> list[str]:
    """
    Start the fine-tuning process using the uploaded file IDs.
    """
    fine_tuning_jobs = []
    for id in file_ids:
        response = client.fine_tuning.jobs.create(
            training_file=id, model="gpt-3.5-turbo"
        )
        fine_tuning_jobs.append(response.id)
    return fine_tuning_jobs


if __name__ == "__main__":
    directory = "data/fine-tuning"
    path_list = get_fine_tuning_files(directory)
    print(f"Found {len(path_list)} files for processing.")

    # Process each fine-tuning file
    for path in path_list:
        process_fine_tuning(path)

    # Upload the processed files
    # file_ids = upload_fine_tuning_files()
    # print(f"Uploaded {len(file_ids)} files for fine-tuning.")

    # Start the fine-tuning process
    # job_ids = start_fine_tuning(file_ids)
    # print(f"Started {len(job_ids)} fine-tuning jobs.")
