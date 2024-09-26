package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"novamd/internal/api"
	"novamd/internal/filesystem"
)

func main() {
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Initialize filesystem
	folderPath := os.Getenv("FOLDER_PATH")
	fs := filesystem.New(folderPath)

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/files", api.ListFiles(fs))
		r.Get("/files/*", api.GetFileContent(fs))
		r.Post("/files/*", api.SaveFile(fs))
		r.Delete("/files/*", api.DeleteFile(fs))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
