FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /service

RUN useradd --create-home --uid 10001 ingestion

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./
COPY tests ./tests

USER ingestion

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=4 \
  CMD python -c "from pathlib import Path; raise SystemExit(0 if Path('/tmp/pharmasmart-ingestion-ready').exists() else 1)"

CMD ["python", "-u", "app.py"]

