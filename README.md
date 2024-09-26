# NovaMD
Yet another markdown editor. Work in progress


## Running the Backend

1. Navigate to the `backend` directory
2. Set the `FOLDER_PATH` environment variable to your desired file storage location
3. Run the server:
   ```
   go run cmd/server/main.go
   ```
   The server will start on port 8080 by default.

## Running the Frontend

1. Navigate to the `frontend` directory
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
   The frontend will be available at `http://localhost:3000`
