package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"novamd/internal/api"
	"novamd/internal/db"
	"novamd/internal/filesystem"
)

func main() {

	// Initialize database
	dbPath := os.Getenv("NOVAMD_DB_PATH")
	if dbPath == "" {
		dbPath = "./sqlite.db"
	}
	database, err := db.Init(dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	// Workdir
	workdir := os.Getenv("NOVAMD_WORKDIR")
	if workdir == "" {
		workdir = "./data"
	}
	fs := filesystem.New(workdir)

	// Set up router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Set up routes
	api.SetupRoutes(r, database, fs)

	// Start server
	port := os.Getenv("NOVAMD_PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
