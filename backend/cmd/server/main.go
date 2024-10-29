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
	"novamd/internal/user"
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
	defer func() {
		if err := database.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	// Initialize filesystem
	workdir := os.Getenv("NOVAMD_WORKDIR")
	if workdir == "" {
		workdir = "./data"
	}
	fs := filesystem.New(workdir)

	// Initialize user service
	userService := user.NewUserService(database, fs)

	adminEmail := os.Getenv("NOVAMD_ADMIN_EMAIL")
	adminPassword := os.Getenv("NOVAMD_ADMIN_PASSWORD")
	if adminEmail == "" || adminPassword == "" {
		log.Fatal("NOVAMD_ADMIN_EMAIL and NOVAMD_ADMIN_PASSWORD environment variables must be set")
	}
	if _, err := userService.SetupAdminUser(adminEmail, adminPassword); err != nil {
		log.Fatal(err)
	}

	// Set up router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		api.SetupRoutes(r, database, fs)
	})

	// Static file serving
	staticPath := os.Getenv("NOVAMD_STATIC_PATH")
	if staticPath == "" {
		staticPath = "../frontend/dist"
	}

	// Handle all other routes with static file server
	r.Get("/*", api.NewStaticHandler(staticPath).ServeHTTP)

	// Start server
	port := os.Getenv("NOVAMD_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
