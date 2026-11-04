import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from asistente import responder
from auth import usuario_actual
from db import Alerta, Cultivo, Dispositivo, Lectura, ahora_utc, get_db
from reglas import evaluar_alertas

Etapa = Literal["germinacion", "vegetativo", "floracion"]


# ---------------- Esquemas (nombres iguales a types.ts de la app) ----------------
class CultivoOut(BaseModel):
    id: str
    nombre: str
    etapa: Etapa
    ultimoContacto: Optional[str] = None  # última vez que algún kit de este cultivo envió datos


class CultivoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    etapa: Etapa = "vegetativo"


class CultivoPatch(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    etapa: Optional[Etapa] = None


class DispositivoIn(BaseModel):
    nombre: str = Field(default="Kit AMPRIC", min_length=1, max_length=60)


class DispositivoOut(BaseModel):
    id: str
    nombre: str
    ultimoContacto: Optional[str] = None


class DispositivoCreado(DispositivoOut):
    clave: str  # se muestra UNA sola vez


class LecturaIn(BaseModel):
    humedadSuelo: float = Field(ge=0, le=100)
    temperatura: Optional[float] = Field(default=None, ge=-20, le=80)
    humedadAmbiente: Optional[float] = Field(default=None, ge=0, le=100)


class LecturaOut(BaseModel):
    id: str
    cultivoId: str
    humedadSuelo: float
    temperatura: Optional[float]
    humedadAmbiente: Optional[float]
    fechaHora: str


class AlertaOut(BaseModel):
    id: str
    cultivoId: str
    tipo: Literal["riego", "hongos"]
    mensaje: str
    fechaHora: str
    estado: Literal["pendiente", "atendida", "descartada"]
    severidad: Literal["ok", "warning", "risk"]


class RespuestaAlerta(BaseModel):
    accion: Literal["atendida", "descartada"]


class MensajeIn(BaseModel):
    rol: Literal["user", "assistant"]
    texto: str = Field(max_length=1000)


class ContextoIn(BaseModel):
    etapa: Etapa
    humedadSuelo: Optional[float] = None
    temperatura: Optional[float] = None
    humedadAmbiente: Optional[float] = None
    horasParaRiego: Optional[float] = None
    alertasPendientes: int = 0
    alertas: List[str] = Field(default_factory=list, max_length=10)


class ChatIn(BaseModel):
    mensajes: List[MensajeIn] = Field(min_length=1, max_length=50)
    contexto: ContextoIn


# ---------------- App ----------------
app = FastAPI(title="AMPRIC API")
app.add_middleware(  # usamos tokens Bearer (no cookies), por eso "*" es aceptable aquí
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


# ---------------- Utilidades ----------------
def a_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def hash_clave(clave: str) -> str:
    return hashlib.sha256(clave.encode()).hexdigest()


def cultivo_propio(db: Session, cid: int, uid: str) -> Cultivo:
    c = db.get(Cultivo, cid)
    if c is None or str(c.user_id) != uid:  # 404 también si es de otro: no revelamos que existe
        raise HTTPException(404, "Cultivo no encontrado")
    return c


def contactos(db: Session, ids: List[int]) -> dict:
    filas = db.execute(
        select(Dispositivo.cultivo_id, func.max(Dispositivo.ultimo_contacto))
        .where(Dispositivo.cultivo_id.in_(ids))
        .group_by(Dispositivo.cultivo_id)
    ).all()
    return {cid: ts for cid, ts in filas}


def cultivo_out(c: Cultivo, contacto: Optional[datetime]) -> CultivoOut:
    return CultivoOut(
        id=str(c.id), nombre=c.nombre, etapa=c.etapa,
        ultimoContacto=a_iso(contacto) if contacto else None,
    )


def lectura_out(l: Lectura) -> LecturaOut:
    return LecturaOut(
        id=str(l.id), cultivoId=str(l.cultivo_id), humedadSuelo=l.humedad_suelo,
        temperatura=l.temperatura, humedadAmbiente=l.humedad_ambiente,
        fechaHora=a_iso(l.fecha_hora),
    )


def alerta_out(a: Alerta) -> AlertaOut:
    return AlertaOut(
        id=str(a.id), cultivoId=str(a.cultivo_id), tipo=a.tipo, mensaje=a.mensaje,
        fechaHora=a_iso(a.fecha_hora), estado=a.estado, severidad=a.severidad,
    )


@app.get("/salud")
def salud():
    return {"estado": "ok"}


# ---------------- Kit (ESP32): se identifica con la clave de SU dispositivo ----------------
@app.post("/lecturas")
def recibir_lectura(body: LecturaIn, x_device_key: str = Header(default=""), db: Session = Depends(get_db)):
    if not x_device_key:
        raise HTTPException(401, "Falta la clave del dispositivo")
    disp = db.scalars(select(Dispositivo).where(Dispositivo.clave_hash == hash_clave(x_device_key))).first()
    if disp is None:
        raise HTTPException(401, "Clave de dispositivo inválida")
    cultivo = db.get(Cultivo, disp.cultivo_id)

    db.add(Lectura(
        cultivo_id=cultivo.id,
        humedad_suelo=body.humedadSuelo,
        temperatura=body.temperatura,
        humedad_ambiente=body.humedadAmbiente,
    ))
    disp.ultimo_contacto = ahora_utc()
    db.commit()
    evaluar_alertas(db, cultivo)
    return {"ok": True}


# ---------------- Cultivos (plantas) del usuario ----------------
@app.get("/cultivos", response_model=List[CultivoOut])
def listar_cultivos(uid: str = Depends(usuario_actual), db: Session = Depends(get_db)):
    cultivos = db.scalars(
        select(Cultivo).where(Cultivo.user_id == uuid.UUID(uid)).order_by(Cultivo.id)
    ).all()
    cont = contactos(db, [c.id for c in cultivos])
    return [cultivo_out(c, cont.get(c.id)) for c in cultivos]


@app.post("/cultivos", response_model=CultivoOut)
def crear_cultivo(body: CultivoIn, uid: str = Depends(usuario_actual), db: Session = Depends(get_db)):
    total = db.scalar(select(func.count(Cultivo.id)).where(Cultivo.user_id == uuid.UUID(uid))) or 0
    if total >= 10:
        raise HTTPException(400, "Alcanzaste el máximo de 10 cultivos")
    c = Cultivo(user_id=uuid.UUID(uid), nombre=body.nombre.strip(), etapa=body.etapa)
    db.add(c)
    db.commit()
    db.refresh(c)
    return cultivo_out(c, None)


@app.patch("/cultivos/{cid}", response_model=CultivoOut)
def actualizar_cultivo(cid: int, body: CultivoPatch, uid: str = Depends(usuario_actual), db: Session = Depends(get_db)):
    c = cultivo_propio(db, cid, uid)
    if body.etapa is not None:
        c.etapa = body.etapa
    if body.nombre is not None:
        c.nombre = body.nombre.strip()
    db.commit()
    return cultivo_out(c, contactos(db, [c.id]).get(c.id))


@app.delete("/cultivos/{cid}")
def borrar_cultivo(cid: int, uid: str = Depends(usuario_actual), db: Session = Depends(get_db)):
    c = cultivo_propio(db, cid, uid)
    db.delete(c)  # la base borra en cascada sus kits, lecturas y alertas
    db.commit()
    return {"ok": True}


# ---------------- Kits de un cultivo ----------------
@app.get("/cultivos/{cid}/dispositivos", response_model=List[DispositivoOut])
def listar_dispositivos(cid: int, uid: str = Depends(usuario_actual), db: Session = Depends(get_db)):
    c = cultivo_propio(db, cid, uid)
    filas = db.scalars(select(Dispositivo).where(Dispositivo.cultivo_id == c.id).order_by(Dispositivo.id)).all()
    return [
        DispositivoOut(id=str(d.id), nombre=d.nombre,
                       ultimoContacto=a_iso(d.ultimo_contacto) if d.ultimo_contacto else None)
        for d in filas
    ]


@app.post("/cultivos/{cid}/dispositivos", response_model=DispositivoCreado)
def crear_dispositivo(cid: int, body: DispositivoIn, uid: str = Depends(usuario_actual), db: Session = Depends(get_db)):
    c = cultivo_propio(db, cid, uid)
    n = db.scalar(select(func.count(Dispositivo.id)).where(Dispositivo.cultivo_id == c.id)) or 0
    if n >= 5:
        raise HTTPException(400, "Máximo 5 kits por cultivo")
    clave = "ampric_" + secrets.token_urlsafe(24)
    d = Dispositivo(cultivo_id=c.id, nombre=body.nombre.strip(), clave_hash=hash_clave(clave))
    db.add(d)
    db.commit()
    db.refresh(d)
    return DispositivoCreado(id=str(d.id), nombre=d.nombre, ultimoContacto=None, clave=clave)


@app.delete("/dispositivos/{did}")
def borrar_dispositivo(did: int, uid: str = Depends(usuario_actual), db: Session = Depends(get_db)):
    d = db.get(Dispositivo, did)
    if d is None:
        raise HTTPException(404, "Kit no encontrado")
    cultivo_propio(db, d.cultivo_id, uid)
    db.delete(d)
    db.commit()
    return {"ok": True}


# ---------------- Lecturas ----------------
CONFIG_RANGO = {"dia": (24, 1), "semana": (28, 6), "mes": (30, 24)}  # (puntos, horas por punto)


@app.get("/cultivos/{cid}/lectura-actual", response_model=Optional[LecturaOut])
def lectura_actual(cid: int, uid: str = Depends(usuario_actual), db: Session = Depends(get_db)):
    cultivo_propio(db, cid, uid)
    u = db.scalars(
        select(Lectura).where(Lectura.cultivo_id == cid).order_by(Lectura.fecha_hora.desc()).limit(1)
    ).first()
    return lectura_out(u) if u else None


@app.get("/cultivos/{cid}/lecturas", response_model=List[LecturaOut])
def lecturas(
    cid: int,
    rango: Literal["dia", "semana", "mes"] = "dia",
    uid: str = Depends(usuario_actual),
    db: Session = Depends(get_db),
):
    cultivo_propio(db, cid, uid)
    cantidad, paso = CONFIG_RANGO[rango]
    inicio = ahora_utc() - timedelta(hours=cantidad * paso)
    filas = db.scalars(
        select(Lectura).where(Lectura.cultivo_id == cid, Lectura.fecha_hora >= inicio).order_by(Lectura.fecha_hora)
    ).all()

    cubetas: dict[int, list[Lectura]] = {}
    for f in filas:
        idx = min(int((f.fecha_hora - inicio).total_seconds() // (paso * 3600)), cantidad - 1)
        cubetas.setdefault(idx, []).append(f)

    def prom(g: list[Lectura], attr: str) -> Optional[float]:
        vals = [getattr(x, attr) for x in g if getattr(x, attr) is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    salida = [
        LecturaOut(
            id=str(g[-1].id), cultivoId=str(cid),
            humedadSuelo=prom(g, "humedad_suelo"), temperatura=prom(g, "temperatura"),
            humedadAmbiente=prom(g, "humedad_ambiente"),
            fechaHora=a_iso(inicio + timedelta(hours=idx * paso)),
        )
        for idx, g in sorted(cubetas.items())
    ]
    if filas:  # el último punto es la lectura real más reciente, no un promedio
        salida[-1] = lectura_out(filas[-1])
    return salida


# ---------------- Alertas ----------------
@app.get("/cultivos/{cid}/alertas", response_model=List[AlertaOut])
def alertas(cid: int, uid: str = Depends(usuario_actual), db: Session = Depends(get_db)):
    cultivo_propio(db, cid, uid)
    filas = db.scalars(
        select(Alerta).where(Alerta.cultivo_id == cid).order_by(Alerta.fecha_hora.desc()).limit(50)
    ).all()
    return [alerta_out(a) for a in filas]


@app.post("/alertas/{aid}/respuesta")
def responder_alerta(aid: int, body: RespuestaAlerta, uid: str = Depends(usuario_actual), db: Session = Depends(get_db)):
    a = db.get(Alerta, aid)
    if a is None:
        raise HTTPException(404, "Alerta no encontrada")
    cultivo_propio(db, a.cultivo_id, uid)
    a.estado = body.accion
    db.commit()
    return {"ok": True}


# ---------------- Asistente (solo usuarios con sesión) ----------------
@app.post("/chat")
def chat(body: ChatIn, uid: str = Depends(usuario_actual)):
    mensajes = [{"role": m.rol, "content": m.texto} for m in body.mensajes[-12:]]
    while mensajes and mensajes[0]["role"] != "user":
        mensajes.pop(0)
    if not mensajes:
        raise HTTPException(400, "La conversación debe empezar con un mensaje del usuario")
    return {"respuesta": responder(mensajes, body.contexto)}