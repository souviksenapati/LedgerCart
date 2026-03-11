# Backend Dockerfile for LedgerCart FastAPI App
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir email-validator bcrypt==4.2.1

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Run the API server
# NOTE: seed.py must NOT be run in production — it drops all tables.
# To seed a fresh dev environment: docker exec -it ledgercart-backend python seed.py
CMD uvicorn app.main:app --host 0.0.0.0 --port 8000
