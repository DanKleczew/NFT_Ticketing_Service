from pydantic import BaseModel

class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    wallet_public_key: str
