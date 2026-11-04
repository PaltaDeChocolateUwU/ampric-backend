from datetime import timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from db import Alerta, Cultivo, Lectura, ahora_utc

UMBRAL_RIEGO = 35.0  
LIMITES_HUMEDAD = {  
    "germinacion": (75, 85),
    "vegetativo": (70, 80),
    "floracion": (55, 65),
}
ETAPA_TXT = {"germinacion": "germinación", "vegetativo": "vegetativo", "floracion": "floración"}
VENTANA_ALERTA_HORAS = 6


def _tramo_actual(lecturas: list[Lectura]) -> list[Lectura]:
    inicio = 0
    for i in range(1, len(lecturas)):
        if lecturas[i].humedad_suelo - lecturas[i - 1].humedad_suelo > 5:
            inicio = i
    return lecturas[inicio:]


def estimar_horas_riego(lecturas: list[Lectura]) -> Optional[float]:
    lecturas = _tramo_actual(lecturas)
    if len(lecturas) < 3:
        return None
    t0 = lecturas[0].fecha_hora
    xs = [(l.fecha_hora - t0).total_seconds() / 3600 for l in lecturas]
    ys = [l.humedad_suelo for l in lecturas]
    if xs[-1] < 0.1:
        return None
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    varianza = sum((x - mx) ** 2 for x in xs)
    if varianza == 0:
        return None
    pendiente = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / varianza
    caida_por_hora = -pendiente
    if caida_por_hora < 0.05:
        return None
    actual = my + pendiente * (xs[-1] - mx)
    return max(0.0, (actual - UMBRAL_RIEGO) / caida_por_hora)


def estado_riego(humedad: float, horas: Optional[float]) -> str:
    if humedad <= 15.0:
        return "risk"
    if horas is None:
        return "ok"
    if horas <= 2:
        return "risk"
    if horas <= 6:
        return "warning"
    return "ok"


def estado_hongos(humedad_ambiente: float, etapa: str) -> str:
    advertencia, riesgo = LIMITES_HUMEDAD[etapa]
    if humedad_ambiente >= riesgo:
        return "risk"
    if humedad_ambiente >= advertencia:
        return "warning"
    return "ok"


def _crear_si_corresponde(db: Session, cultivo_id: int, tipo: str, severidad: str, mensaje: str) -> None:
    desde = ahora_utc() - timedelta(hours=VENTANA_ALERTA_HORAS)
    previa = db.scalars(
        select(Alerta)
        .where(
            Alerta.cultivo_id == cultivo_id,
            Alerta.tipo == tipo,
            Alerta.estado == "pendiente",
            Alerta.fecha_hora >= desde
        )
        .order_by(Alerta.fecha_hora.desc())
    ).first()

    if previa is not None:
        previa.severidad = severidad
        previa.mensaje = mensaje
        previa.fecha_hora = ahora_utc()
        db.commit()
    else:
        db.add(Alerta(
            cultivo_id=cultivo_id,
            tipo=tipo,
            severidad=severidad,
            mensaje=mensaje,
            estado="pendiente",
            fecha_hora=ahora_utc()
        ))
        db.commit()


def evaluar_alertas(db: Session, cultivo: Cultivo) -> None:
    desde = ahora_utc() - timedelta(hours=6)
    lecturas = db.scalars(
        select(Lectura)
        .where(Lectura.cultivo_id == cultivo.id, Lectura.fecha_hora >= desde)
        .order_by(Lectura.fecha_hora)
    ).all()
    if not lecturas:
        return
    ultima = lecturas[-1]

    # --- Riego ---
    horas = estimar_horas_riego(lecturas)
    sev_riego = estado_riego(ultima.humedad_suelo, horas)
    
    if sev_riego != "ok":
        if ultima.humedad_suelo <= 15.0:
            msg = f"Suelo extremadamente seco o sensor desconectado ({ultima.humedad_suelo:.0f}%)."
        elif horas is not None and horas <= 2:
            msg = f"La humedad del suelo está en {ultima.humedad_suelo:.0f}%. El nivel crítico está muy cerca ({horas:.1f}h)."
        else:
            msg = f"La humedad del suelo está en {ultima.humedad_suelo:.0f}%. Se recomienda regar pronto."
        _crear_si_corresponde(db, cultivo.id, "riego", sev_riego, msg)

    # --- Hongos ---
    sev_hongos = estado_hongos(ultima.humedad_ambiente, cultivo.etapa)
    if sev_hongos != "ok":
        limite = LIMITES_HUMEDAD[cultivo.etapa][1 if sev_hongos == "risk" else 0]
        msg = f"Humedad ambiental alta ({ultima.humedad_ambiente:.0f}% vs límite de {limite}%)."
        _crear_si_corresponde(db, cultivo.id, "hongos", sev_hongos, msg)