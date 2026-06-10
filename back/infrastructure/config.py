from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

_BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(_BASE_DIR / ".env", override=True)

class Configuration(BaseSettings):
    owner_address: str = ""
    owner_private_key: str = ""
    
    rpc_url: str = ""

CONFIG = Configuration()