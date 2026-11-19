
FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# Install CPU-only PyTorch
RUN pip install --no-cache-dir \
    --default-timeout=1000 \
    --retries=10 \
    --index-url https://download.pytorch.org/whl/cpu \
    torch==2.5.1+cpu torchvision==0.20.1+cpu

# Install remaining OCR dependencies
RUN pip install --no-cache-dir \
    --default-timeout=1000 \
    --retries=10 \
    -r requirements.txt

COPY . .

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
    