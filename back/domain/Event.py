from pydantic import BaseModel

class EventCreate(BaseModel):
    name: str
    description: str

class EventRead(BaseModel):
    id: int
    name: str
    description: str
