# Aero Nova DSS backend — FastAPI + PuLP + CBC.
# Runs anywhere that hosts a container: Render, Fly.io, Railway, Cloud Run, Docker.
FROM python:3.11-slim

# CBC solver is a system dependency for PuLP.
RUN apt-get update && apt-get install -y --no-install-recommends \
      coinor-cbc \
      curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY . .

ENV PORT=8000 \
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8

EXPOSE 8000

# Render / Fly / Railway inject $PORT — bind to it.
CMD ["sh", "-c", "uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}"]
