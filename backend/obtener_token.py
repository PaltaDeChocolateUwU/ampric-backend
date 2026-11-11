import getpass
import sys

import httpx

from config import SUPABASE_KEY, SUPABASE_URL

correo = input("Correo: ")
clave = getpass.getpass("Contraseña: ")

r = httpx.post(
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
    json={"email": correo, "password": clave},
    timeout=15,
)
if r.status_code != 200:
    print("Error:", r.status_code, r.text[:300])
    sys.exit(1)

print("\nTOKEN (dura cerca de 1 hora):\n")
print(r.json()["access_token"])