from enum import Enum, unique
import json
from os import name
from model.network import Network


class DataUtils:
    @unique
    class QueryFlag(Enum):
        BY_ID = 1
        BY_NAME = 2

    def __get_supported_networks(self, flag: QueryFlag) -> dict[str | int, Network]:
        """
        Get supported networks from a json file
        """
        file_path = "data/network.json"
        with open(file_path, "r") as file:
            json_content = json.load(file)

        if flag == self.QueryFlag.BY_NAME:
            key = "name"
        elif flag == self.QueryFlag.BY_ID:
            key = "id"
        else:
            raise ValueError(f"Invalid query flag: {flag}")

        return {
            item[key]: Network(
                id=item["id"], name=item["name"], rpc_url=item["rpc_url"]
            )
            for item in json_content
        }

    def get_network_info_by_name(self, name: str) -> Network | None:
        """
        Get network info by name
        """
        supported_networks = self.__get_supported_networks(self.QueryFlag.BY_NAME)
        return supported_networks.get(name.lower(), None)

    def get_network_info_by_id(self, id: int) -> Network | None:
        """
        Get network info by id
        """
        supported_networks = self.__get_supported_networks(self.QueryFlag.BY_ID)
        return supported_networks.get(id, None)

    def get_supported_actions(self) -> dict[str, str]:
        """
        Get supported actions from a json file
        """
        file_path = "data/action.json"
        with open(file_path, "r") as file:
            json_content = json.load(file)
        return {item["action"]: item["description"] for item in json_content}

    def evaluate_action(
        self, action_item: dict, supported_actions: dict[str, str]
    ) -> None:
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


# if __name__ == "__main__":
#     pass
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
