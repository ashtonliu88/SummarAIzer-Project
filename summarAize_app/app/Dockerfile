FROM python:3.10-slim

# 1. OS-level bits
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      python3-distutils \
      swig \
      ffmpeg \
      espeak \
      libespeak-dev \
      libxml2-dev \
      libxslt1-dev \
      wget \
      python3-dev && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --upgrade pip "setuptools<65" wheel

WORKDIR /app

# 2. Install NumPy first, then everything else (minus aeneas)
COPY requirements.txt .
RUN pip install --no-cache-dir numpy==1.22.4 cython && \
    grep -v '^aeneas==' requirements.txt > /tmp/reqs.txt && \
    pip install --no-cache-dir -r /tmp/reqs.txt

# 3. Aeneas (pure-Python mode)
ENV AENEAS_USE_CEXTENSIONS=FALSE
RUN pip install --no-cache-dir aeneas==1.7.3.0

# 4. App code & folders
COPY . .
RUN mkdir -p generated_audios uploads

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
