# Lemma

![Build](https://github.com/lordmathis/lemma/actions/workflows/build-and-release.yml/badge.svg) ![Backend Tests](https://github.com/lordmathis/lemma/actions/workflows/go-test.yml/badge.svg) ![Frontend Tests](https://github.com/lordmathis/lemma/actions/workflows/frontend-tests.yml/badge.svg)

Yet another markdown editor. Work in progress

## Features

- **Editing & Content**
  - **Rich Markdown Editing** - Full-featured editor with syntax highlighting and live preview
  - **Wikilinks Support** - Create interconnected notes with `[[wikilink]]` syntax and smart autocomplete
  - **Math Equations** - Render beautiful mathematical expressions with MathJax support
  - **Code Highlighting** - Syntax highlighting for code blocks in multiple languages
- **Organization & Workflow**
  - **File Tree Navigation** - Organized folder structure with intuitive file management
  - **Multi-Workspace** - Manage multiple projects and note collections in one place
  - **Git Integration** - Built-in version control to track changes and collaborate safely
- **Customization**
  - **Theme Flexibility** - Switch between dark and light modes to match your preference

## Prerequisites

- Go 1.23 or later
- Node.js 20 or later
- gcc (for go-sqlite3 package)

## Configuration

Lemma is configured using environment variables.

### Environment Variables

| Variable                    | Required | Default             | Description                                                                                              |
| --------------------------- | -------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| `LEMMA_ADMIN_EMAIL`         | Yes      | -                   | Email address for the admin account                                                                      |
| `LEMMA_ADMIN_PASSWORD`      | Yes      | -                   | Password for the admin account                                                                           |
| `LEMMA_ENV`                 | No       | production          | Set to "development" to enable development mode                                                          |
| `LEMMA_DB_URL`              | No       | `sqlite://lemma.db` | Database connection string (supports `sqlite://`, `sqlite3://`, `postgres://`, `postgresql://` prefixes) |
| `LEMMA_WORKDIR`             | No       | `./data`            | Working directory for application data                                                                   |
| `LEMMA_STATIC_PATH`         | No       | `../app/dist`       | Path to static files                                                                                     |
| `LEMMA_PORT`                | No       | `8080`              | Port to run the server on                                                                                |
| `LEMMA_DOMAIN`              | No       | -                   | Domain name for cookie authentication                                                                    |
| `LEMMA_CORS_ORIGINS`        | No       | -                   | Comma-separated list of allowed CORS origins                                                             |
| `LEMMA_ENCRYPTION_KEY`      | No       | auto-generated      | Base64-encoded 32-byte key for encrypting sensitive data                                                 |
| `LEMMA_JWT_SIGNING_KEY`     | No       | auto-generated      | Key used for signing JWT tokens                                                                          |
| `LEMMA_LOG_LEVEL`           | No       | DEBUG/INFO\*        | Logging level (\*DEBUG in dev, INFO in production)                                                       |
| `LEMMA_RATE_LIMIT_REQUESTS` | No       | `100`               | Number of allowed requests per window                                                                    |
| `LEMMA_RATE_LIMIT_WINDOW`   | No       | `15m`               | Duration of the rate limit window                                                                        |

### Security Keys

Security keys (`LEMMA_ENCRYPTION_KEY` and `LEMMA_JWT_SIGNING_KEY`) are automatically generated on first startup if not provided. Keys are stored in `{LEMMA_WORKDIR}/secrets/`.

**Important:** Back up the `secrets` directory!

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
