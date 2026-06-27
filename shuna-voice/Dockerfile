# Use lightweight python image
FROM python:3.11-slim

# Install system dependencies, including espeak-ng and libsndfile (soundfile requirement)
RUN apt-get update && apt-get install -y \
    espeak-ng \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Run the app using uvicorn
EXPOSE 10000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
