FROM python:3.12-slim

WORKDIR /app

# CPU-only torch first (~200MB). Without this pip pulls the CUDA build + ~3GB of nvidia libs.
RUN pip install --no-cache-dir --default-timeout=1000 --retries=10 \
    torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=60 --retries=10 -r requirements.txt
RUN python -m spacy download en_core_web_sm
RUN python -m spacy download xx_ent_wiki_sm

COPY . .
EXPOSE 8003
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]