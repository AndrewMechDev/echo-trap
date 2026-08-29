from transformers import pipeline

_pipe = pipeline(
    "audio-classification",
    model="MelodyMachine/Deepfake-audio-detection-V2",
    device="cpu",   # explícito: nunca busca GPU, evita cualquier problema de drivers
)

def clasificar(audio_path: str) -> dict:
    resultados = _pipe(audio_path)
    return {"resultados": resultados}
