import json
from pathlib import Path
from web3 import Web3

from infrastructure.config import CONFIG


# Common
with open(Path(__file__).parent / "Ticket.json") as fjson:
        artifact = json.load(fjson)
        
ABI = artifact["abi"]
BYTECODE = artifact["bytecode"]["object"]

# ***
# Functions
# ***
def create_contract(name: str, max_supply: int, ticket_price_in_eth: int) -> str:
    w3 = Web3(Web3.HTTPProvider(CONFIG.rpc_url))
    if not w3.is_connected():
        raise Exception("Impossible de se connecter au noeud Ethereum")
    
    contract = w3.eth.contract(abi=ABI, bytecode=BYTECODE)

    nonce = w3.eth.get_transaction_count(CONFIG.owner_address)

    transaction = contract.constructor(name, "#", max_supply, "https://todo", ticket_price_in_eth).build_transaction(
         {
            'chainId': w3.eth.chain_id,
            'gas': 3000000,
            'maxFeePerGas': w3.to_wei('50', 'gwei'),
            'maxPriorityFeePerGas': w3.to_wei('1.5', 'gwei'),
            'nonce': nonce
        }
    )

    signed_txn = w3.eth.account.sign_transaction(transaction, private_key=CONFIG.owner_private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    return receipt.contractAddress



def mint(address_contract: str, quantity: int, address_to: str):
    
    w3 = Web3(Web3.HTTPProvider(CONFIG.rpc_url))

    if not w3.is_connected():
        raise Exception("Impossible de se connecter au noeud Ethereum")


    contract = w3.eth.contract(address=address_contract, abi=ABI)

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