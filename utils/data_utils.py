import json
from enum import Enum, unique
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
                id=item["id"],
                name=item["name"],
                rpc_url=item["rpc_url"],
                symbol=item["symbol"],
                decimals=item["decimals"],
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
