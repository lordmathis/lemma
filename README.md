# NovaMD

Yet another markdown editor. Work in progress

## Features

- Markdown editing with syntax highlighting
- File tree navigation
- Git integration for version control
- Dark and light theme support
- Multiple workspaces
- Math equation support (KaTeX)
- Code syntax highlighting

## Prerequisites

- Go 1.23 or later
- Node.js 20 or later
- gcc (for go-sqlite3 package)

## Setup

Set the following environment variables:

- `CGO_ENABLED=1`: This is necessary for the go-sqlite3 package
- `NOVAMD_DB_PATH`: Path to the SQLite database file (default: "./sqlite.db")
- `NOVAMD_WORKDIR`: Directory for storing Markdown files (default: "./data")
- `NOVAMD_STATIC_PATH`: Path to the frontend build files (default: "../app/dist")
- `NOVAMD_PORT`: Port to run the server on (default: "8080")
- `NOVAMD_ADMIN_EMAIL`: Admin user email
- `NOVAMD_ADMIN_PASSWORD`: Admin user password
- `NOVAMD_ENCRYPTION_KEY`: 32-byte key for encrypting sensitive data

To generate a secure encryption key you can use openssl:

```bash
openssl rand -base64 32
```

## Running the Backend

1. Navigate to the `server` directory
2. Ensure all environment variables are set
3. Run the server:
   ```
   go run cmd/server/main.go
   ```

## Running the Frontend

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

## Building for Production

1. Build the frontend app:
   ```
   cd app
   npm run build
   ```
2. Build the backend:
   ```
   cd server
   go build -o novamd ./cmd/server
   ```
3. Set the `NOVAMD_STATIC_PATH` environment variable to point to the frontend build directory
4. Run the `novamd` executable

## Docker Support

A Dockerfile is provided for easy deployment. To build and run the Docker image:

1. Build the image:
   ```
   docker build -t novamd .
   ```
2. Run the container:
   ```
   docker run -p 8080:8080 -v /path/to/data:/app/data novamd
   ```
