from pydantic import BaseModel

class EventCreate(BaseModel):
    name: str
    description: str
    public_contract_id: str
    max_supply: int
    ticket_price_in_eth: int

class EventRead(BaseModel):
    id: int
    name: str
    description: str
