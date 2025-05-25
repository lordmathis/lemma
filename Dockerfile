# Stage 1: Build the frontend
FROM node:24-slim AS frontend-builder
WORKDIR /app
COPY app/package*.json ./
RUN npm ci
COPY app .
RUN npm run build

# Stage 2: Build the backend
FROM golang:1.23 AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y gcc musl-dev
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server .
RUN CGO_ENABLED=1 GOOS=linux go build -o lemma ./cmd/server

# Stage 3: Final stage
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates
RUN update-ca-certificates
WORKDIR /app
COPY --from=backend-builder /app/lemma .
COPY --from=frontend-builder /app/dist ./dist

RUN mkdir -p /app/data

# Set default environment variables
ENV LEMMA_STATIC_PATH=/app/dist
ENV LEMMA_PORT=8080
ENV LEMMA_WORKDIR=/app/data

EXPOSE 8080

CMD ["./lemma"]