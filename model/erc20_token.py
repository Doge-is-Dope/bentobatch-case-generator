class ERC20Token:
    def __init__(self, name, symbol, contract_addr):
        self.name = name
        self.symbol = symbol
        self.contract_addr = contract_addr

    def __str__(self):
        return f"ERC20Token(name={self.name}, symbol={self.symbol}, contract_addr={self.contract_addr})"
