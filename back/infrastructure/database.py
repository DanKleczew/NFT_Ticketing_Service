from sqlalchemy import ForeignKeyConstraint, create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker


# *** DB Configuration *** 
DATABASE_URL = "sqlite:///./ticketselling.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# *** Model ***

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, index=True)
    description = Column(String)

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    first_name = Column(String)
    last_name = Column(String)
    wallet_public_key = Column(String)

class EuroPayment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    amount = Column(Integer)
    client_id = Column(Integer)
    event_id = Column(Integer)
    ForeignKeyConstraint(
        ["client_id", "event_id"], ["clients.id", "events.id"]
    )


Base.metadata.create_all(bind=engine)

# *** Utils DB ***

def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
