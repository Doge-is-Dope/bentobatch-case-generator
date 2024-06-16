class Network:
    def __init__(self, id: int, name: str, rpc_url: str, symbol: str, decimals: int):
        self.id = id
        self.name = name
        self.rpc_url = rpc_url
        self.symbol = symbol
        self.decimals = decimals

    def __str__(self):
        return f"Network(id={self.id}, name={self.name}, rpc_url={self.rpc_url}, symbol={self.symbol}, decimals={self.decimals})"
