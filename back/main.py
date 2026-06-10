from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse

from domain.Event import EventCreate
from infrastructure.database import Event, get_db_session
from sqlalchemy.orm import Session

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}


@app.post("/event")
def create_event(create_data: EventCreate, db_session: Session = Depends(get_db_session)):
    db_event = Event(**create_data.model_dump())
    db_session.add(db_event)
    db_session.commit()

    return JSONResponse(None, status_code=201)

@app.get("/event")
def get_all_events(db_session: Session = Depends(get_db_session)):
    db_events = db_session.query(Event).all()
    return db_events
