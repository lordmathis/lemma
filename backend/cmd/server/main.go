package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"novamd/internal/api"
	"novamd/internal/config"
	"novamd/internal/db"
	"novamd/internal/filesystem"
	"novamd/internal/user"
)

func main() {

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Initialize database
	database, err := db.Init(cfg.DBPath, cfg.EncryptionKey)
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := database.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	// Initialize filesystem
	fs := filesystem.New(cfg.WorkDir)

	// Initialize user service
	userService := user.NewUserService(database, fs)

	// Create admin user
	if _, err := userService.SetupAdminUser(cfg.AdminEmail, cfg.AdminPassword); err != nil {
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

	// Handle all other routes with static file server
	r.Get("/*", api.NewStaticHandler(cfg.StaticPath).ServeHTTP)

	// Start server
	port := os.Getenv("NOVAMD_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
