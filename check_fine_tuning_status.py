import os
import openai


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("job_id", help="The ID of the fine-tuning job to check.")
    args = parser.parse_args()

    client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    job = client.fine_tuning.jobs.retrieve(args.job_id)

    print(f"Status: {job.status}")
    if job.fine_tuned_model:
        print(f"Model: {job.fine_tuned_model}")
