from fastapi import FastAPI, UploadFile, Header, HTTPException
import tempfile, os
from model import clasificar

app = FastAPI()
INTERNAL_API_KEY = os.environ["INTERNAL_API_KEY"]

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/detect")
async def detect(audio: UploadFile, x_api_key: str = Header(...)):
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="no autorizado")
    # En Windows, NamedTemporaryFile bloquea el archivo mientras el handle sigue
    # abierto — el pipeline no puede reabrirlo dentro del mismo `with`. Se usa
    # delete=False, se cierra el handle antes de pasarlo al pipeline, y se borra
    # manualmente después (funciona igual en Windows/macOS/Linux).
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    try:
        tmp.write(await audio.read())
        tmp.close()
        return clasificar(tmp.name)
    finally:
        os.unlink(tmp.name)
