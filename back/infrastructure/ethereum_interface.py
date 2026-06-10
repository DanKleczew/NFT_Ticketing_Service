from web3 import Web3

from infrastructure.config import CONFIG


def create_contract() -> str:
    pass

def mint(address_contract: str, quantity: int, address_to: str):
    RPC_URL = CONFIG.rpc_url
    w3 = Web3(Web3.HTTPProvider(RPC_URL))

    if not w3.is_connected():
        raise Exception("Impossible de se connecter au noeud Ethereum")


    contract_abi = [
        {
            "inputs": [
                {"internalType": "address", "name": "to", "type": "address"},
                {"internalType": "uint256", "name": "quantity", "type": "uint256"}
            ],
            "name": "mint",
            "outputs": [
                {"internalType": "uint256[]", "name": "", "type": "uint256[]"}
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]

    contract = w3.eth.contract(address=address_contract, abi=contract_abi)

    nonce = w3.eth.get_transaction_count(CONFIG.owner_address)

    transaction = contract.functions.mint(address_to, quantity).build_transaction({
        'chainId': w3.eth.chain_id,  
        'gas': 200000,              
        'maxFeePerGas': w3.to_wei('50', 'gwei'),
        'maxPriorityFeePerGas': w3.to_wei('1.5', 'gwei'),
        'nonce': nonce,
    })


    signed_txn = w3.eth.account.sign_transaction(transaction, private_key=CONFIG.owner_private_key)

    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)

    w3.eth.wait_for_transaction_receipt(tx_hash)