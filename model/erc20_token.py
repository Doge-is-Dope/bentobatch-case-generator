class Erc20Token:
    def __init__(self, contract_addr, name, symbol, decimals):
        self.contract_addr = contract_addr
        self.name = name
        self.symbol = symbol
        self.decimals = decimals

    def __str__(self):
        return f"Erc20Token=(Contract address: {self.contract_addr}, Name: {self.name}, Symbol: {self.symbol}, Decimals: {self.decimals})"
