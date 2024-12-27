# Lemma

![Build](https://github.com/LordMathis/Lemma/actions/workflows/build-and-release.yml/badge.svg) ![Go Tests](https://github.com/LordMathis/Lemma/actions/workflows/go-test.yml/badge.svg)

Yet another markdown editor. Work in progress

## Features

- Markdown editing with syntax highlighting
- File tree navigation
- Git integration for version control
- Dark and light theme support
- Multiple workspaces
- Math equation support (MathJax)
- Code syntax highlighting

## Prerequisites

- Go 1.23 or later
- Node.js 20 or later
- gcc (for go-sqlite3 package)

## Configuration

Lemma can be configured using environment variables. Here are the available configuration options:

### Required Environment Variables

- `LEMMA_ADMIN_EMAIL`: Email address for the admin account
- `LEMMA_ADMIN_PASSWORD`: Password for the admin account
- `LEMMA_ENCRYPTION_KEY`: Base64-encoded 32-byte key used for encrypting sensitive data

### Optional Environment Variables

- `LEMMA_ENV`: Set to "development" to enable development mode
- `LEMMA_DB_PATH`: Path to the SQLite database file (default: "./lemma.db")
- `LEMMA_WORKDIR`: Working directory for application data (default: "./data")
- `LEMMA_STATIC_PATH`: Path to static files (default: "../app/dist")
- `LEMMA_PORT`: Port to run the server on (default: "8080")
- `LEMMA_DOMAIN`: Domain name where the application is hosted for cookie authentication
- `LEMMA_CORS_ORIGINS`: Comma-separated list of allowed CORS origins
- `LEMMA_JWT_SIGNING_KEY`: Key used for signing JWT tokens
- `LEMMA_LOG_LEVEL`: Logging level (defaults to DEBUG in development mode, INFO in production)
- `LEMMA_RATE_LIMIT_REQUESTS`: Number of allowed requests per window (default: 100)
- `LEMMA_RATE_LIMIT_WINDOW`: Duration of the rate limit window (default: 15m)

### Generating Encryption Keys

The encryption key must be a base64-encoded 32-byte value. You can generate a secure encryption key using OpenSSL:

```bash
# Generate a random 32-byte key and encode it as base64
openssl rand -base64 32
```

Store the generated key securely - it will be needed to decrypt any data encrypted by the application. If the key is lost or changed, previously encrypted data will become inaccessible.

## Running the backend server

1. Navigate to the `server` directory
2. Install dependecies: `go mod tidy`
3. Ensure all environment variables are set
4. Additionally set `CGO_ENABLED=1` (needed for sqlite3)
5. Run the server:
   ```
   go run cmd/server/main.go
   ```

## Running the frontend app

1. Navigate to the `app` directory
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
   The frontend will be available at `http://localhost:3000`

## Building for production

1. Build the frontend app:
   ```
   cd app
   npm run build
   ```
2. Build the backend:
   ```
   cd server
   go build -o lemma ./cmd/server
   ```
3. Set the `LEMMA_STATIC_PATH` environment variable to point to the frontend build directory
4. Run the `lemma` executable

## Docker Support

A Dockerfile is provided for easy deployment. To build and run the Docker image:

1. Build the image:
   ```
   docker build -t lemma .
   ```
2. Run the container:
   ```
   docker run -p 8080:8080 -v /path/to/data:/app/data lemma
   ```

## Upgrading

Before first stable release (1.0.0) there is not upgrade path. You have to delete the database file and start over.
