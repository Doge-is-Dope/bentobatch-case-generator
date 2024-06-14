# Transaction Generator

### Directory Structure

```
- data/
- fine-tuning/
- models/
- tests/
- scripts/
- utils/
- web3_utils/
fine-tuning.ipynb
train_fine_tuning_model.ipynb
```

- `data/`: Contains the data used in the project. e.g. the ERC-20 tokens and network data supported by the project.
- `fine-tuning/`: Contains the dataset for fine-tuning the GPT model. e.g. transfer.jsonl, approve.jsonl, etc.
- `models/`: Contains Python models. e.g. erc20_token.py, network.py, etc.
- `scripts/`: Contains the scripts. e.g. setup the project, etc.
- `tests/`: Contains the test cases for the utils.
- `utils/`: Contains the utility functions used in the project. e.g. , get_supported_network_by_id, etc.
- `web3_utils/`: Contains the web3 utility functions. e.g. get_erc20_token_info, etc.
