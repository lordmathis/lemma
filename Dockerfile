# Stage 1: Build the frontend
FROM node:20 AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
RUN npm run build

# Stage 2: Build the backend
FROM golang:1.23 AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y gcc musl-dev
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend .
RUN CGO_ENABLED=1 GOOS=linux go build -o novamd ./cmd/server

# Stage 3: Final stage
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=backend-builder /app/novamd .
COPY --from=frontend-builder /app/dist ./dist

RUN mkdir -p /app/data

# Set default environment variables
ENV NOVAMD_STATIC_PATH=/app/dist
ENV NOVAMD_PORT=8080
ENV NOVAMD_WORKDIR=/app/data

EXPOSE 8080

CMD ["./novamd"]