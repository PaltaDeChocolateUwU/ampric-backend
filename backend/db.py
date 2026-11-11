import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, create_engine
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from config import DATABASE_URL


def ahora_utc() -> datetime:
    return datetime.now(timezone.utc)


engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=3, max_overflow=2, pool_recycle=900)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass



class Cultivo(Base):
    __tablename__ = "cultivo"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), index=True
    )

    nombre: Mapped[str] = mapped_column(String(100))

    etapa: Mapped[str] = mapped_column(
        String(20), default="vegetativo"
    )

    alertas_config: Mapped[dict] = mapped_column(
        JSONB,
        default=lambda: {
            "riego": True,
            "hongos": True,
            "temperatura": True,
            "suelo_humedo": True,
        },
        nullable=False,
    )

    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=ahora_utc
    )



class Dispositivo(Base):
    __tablename__ = "dispositivo"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    cultivo_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("cultivo.id"), index=True)
    nombre: Mapped[str] = mapped_column(String(60))
    clave_hash: Mapped[str] = mapped_column(String(64), unique=True)
    ultimo_contacto: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora_utc)


class Lectura(Base):
    __tablename__ = "lectura"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    cultivo_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("cultivo.id"), index=True)
    humedad_suelo: Mapped[float]
    temperatura: Mapped[Optional[float]]
    humedad_ambiente: Mapped[Optional[float]]
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora_utc, index=True)


class Alerta(Base):
    __tablename__ = "alerta"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    cultivo_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("cultivo.id"), index=True)
    tipo: Mapped[str] = mapped_column(String(20))
    severidad: Mapped[str] = mapped_column(String(10))
    mensaje: Mapped[str] = mapped_column(String(300))
    estado: Mapped[str] = mapped_column(String(15), default="pendiente")
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora_utc, index=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()