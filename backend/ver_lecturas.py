from sqlalchemy import func, select

from db import Lectura, SessionLocal

db = SessionLocal()
total = db.scalar(select(func.count(Lectura.id)))
print(f"Total de lecturas guardadas: {total}\n")

ultimas = db.scalars(select(Lectura).order_by(Lectura.id.desc()).limit(10)).all()
for l in reversed(ultimas):
    print(l.fecha_hora, "| suelo", l.humedad_suelo, "| temp", l.temperatura, "| hum", l.humedad_ambiente)
    