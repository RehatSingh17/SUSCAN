FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=300 --retries=10 --index-url https://download.pytorch.org/whl/cpu --no-deps torch

RUN pip install --no-cache-dir --default-timeout=300 --retries=10 -r requirements.txt

COPY . .
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
