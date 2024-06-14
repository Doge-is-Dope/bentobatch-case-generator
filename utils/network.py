class Network:
    def __init__(self, id: int, name: str, rpc_url: str):
        self.id = id
        self.name = name
        self.rpc_url = rpc_url

    def __str__(self):
        return f"Network(id={self.id}, name={self.name}, rpc_url={self.rpc_url})"
