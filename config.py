import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
# Corregido para leer las variables con el prefijo correcto de tu .env
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
OPEN_ROUTER_API_KEY = os.getenv("OPEN_ROUTER_API_KEY", "")
OPEN_ROUTER_MODEL = os.getenv("OPEN_ROUTER_MODEL", "")
OPEN_ROUTER_FALLBACK_MODEL = os.getenv("OPEN_ROUTER_FALLBACK_MODEL", "")

if not DATABASE_URL:
    raise RuntimeError("Falta DATABASE_URL en el .env")

if not SUPABASE_URL:
    raise RuntimeError("Falta NEXT_PUBLIC_SUPABASE_URL en el .env")