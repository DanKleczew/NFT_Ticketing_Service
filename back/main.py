from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from infrastructure.ethereum_interface import create_contract, mint
from domain.Client import ClientCreate
from domain.Event import EventCreate
from infrastructure.database import EuroPayment, Event, Client, get_db_session
from sqlalchemy.orm import Session

app = FastAPI()

<<<<<<< HEAD
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}


=======
>>>>>>> 7194638 (.env et début interface ethereum)
# Events
@app.post("/event")
def create_event(create_data: EventCreate, db_session: Session = Depends(get_db_session)):
    public_contract_address:str = create_contract(create_data.name, create_data.max_supply, create_data.ticket_price_in_eth)

    db_event = Event(name=create_data.name, public_contract_address=public_contract_address, description=create_data.description)
    db_session.add(db_event)
    db_session.commit()

    return JSONResponse(None, status_code=201)

@app.get("/event")
def get_all_events(db_session: Session = Depends(get_db_session)):
    db_events = db_session.query(Event).all()
    return db_events

@app.get("/event/{event_id}")
def get_event(event_id: int, db_session: Session = Depends(get_db_session)):
    db_event = db_session.query(Event).get(event_id)
    return db_event


# Clients
@app.post("/client")
def create_client(create_data: ClientCreate, db_session: Session = Depends(get_db_session)):
    db_client = Client(**create_data.model_dump())
    db_session.add(db_client)
    db_session.commit()

    return JSONResponse(None, status_code=201)

  # Not necessarily useful  
@app.get("/client")
def get_all_clients(db_session: Session = Depends(get_db_session)):
    db_clients = db_session.query(Client).all()
    return db_clients

@app.get("/client/{client_id}")
def get_client_by_id(client_id: int, db_session: Session = Depends(get_db_session)):
    db_client = db_session.query(Client).get(client_id)
    return db_client


# Payments
@app.post("/payment")
def make_euro_payment(amount: int, tickets_number: int, client_id: int, event_id: int, db_session: Session = Depends(get_db_session)):

    if amount <= 0:
        return JSONResponse(f"Cannot make payment with negative or null amount : {amount}", status_code=400)
    
    db_client = db_session.query(Client).get(client_id)
    if db_client is None:
        return JSONResponse(f"Client with id {client_id} does not exist", status_code=404)
    
    db_event = db_session.query(Event).get(event_id)
    if db_event is None:
        return JSONResponse(f"Event with id {db_event} does not exist", status_code=404)
    
    mint(db_event.public_contract_address, tickets_number, db_client.wallet_public_key)

    new_payment: EuroPayment = EuroPayment(amount=amount, client_id=client_id, event_id=event_id, tickets_number=tickets_number)
    db_session.add(new_payment)
    db_session.commit()

    return JSONResponse("Payment made, Tokens minted", status_code=200)

@app.get("/payment")
def get_all_euro_payments(db_session: Session = Depends(get_db_session)):
    return db_session.query(EuroPayment).all()

<<<<<<< HEAD
def do_mint():
    pass
=======


>>>>>>> 7194638 (.env et début interface ethereum)
