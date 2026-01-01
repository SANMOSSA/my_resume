FROM python:3.10
WORKDIR /app
COPY requirements.txt .
RUN apt-get update && apt-get install -y cloud-init
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["python3", "app"]