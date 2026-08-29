FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

# torch se instala aparte, CPU-only, para evitar que pip resuelva la rueda con CUDA
# (ver requirements/CLAUDE_CODE_BRIEF.md, sección 6).
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
