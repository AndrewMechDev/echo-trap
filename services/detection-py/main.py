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
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        tmp.write(await audio.read())
        tmp.flush()
        return clasificar(tmp.name)
