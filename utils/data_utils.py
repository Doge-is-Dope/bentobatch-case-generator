import re
import json


def get_supported_actions() -> dict[str, str]:
    """
    Get supported actions from a json file
    """
    file_path = "data/action.json"
    with open(file_path, "r") as file:
        json_content = json.load(file)
    return {item["action"]: item["description"] for item in json_content}


def evaluate_action(action_item: dict, supported_actions: dict[str, str]) -> None:
    """
    Evaluate an action item
    """
    action = action_item["action"]
    if action in supported_actions:
        chain = action_item["chain"]
        amount = action_item["amount"]
        token = action_item["token"]
        receiver = action_item["receiver"]
        print(
            supported_actions[action].format(
                chain=chain, amount=amount, token=token, receiver=receiver
            )
        )
    else:
        print(f"Unknown action: {action}")


if __name__ == "__main__":
    pass
    # supported_actions = get_supported_actions()
    # actions = [
    #     {
    #         "action": "transfer",
    #         "chain": "Blast",
    #         "amount": "12",
    #         "token": "ETH",
    #         "receiver": "trump.eth",
    #     }
    # ]
    # for action in actions:
    #     evaluate_action(action, supported_actions)
