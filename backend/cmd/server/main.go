package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"

	"novamd/internal/api"
	"novamd/internal/auth"
	"novamd/internal/config"
	"novamd/internal/db"
	"novamd/internal/filesystem"
	"novamd/internal/handlers"
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
	defer database.Close()

	// Get or generate JWT signing key
	signingKey := cfg.JWTSigningKey
	if signingKey == "" {
		signingKey, err = database.EnsureJWTSecret()
		if err != nil {
			log.Fatal("Failed to ensure JWT secret:", err)
		}
	}

	// Initialize filesystem
	fs := filesystem.New(cfg.WorkDir)

	// Initialize JWT service
	jwtService, err := auth.NewJWTService(auth.JWTConfig{
		SigningKey:         signingKey,
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 7 * 24 * time.Hour,
	})
	if err != nil {
		log.Fatal("Failed to initialize JWT service:", err)
	}

	// Initialize auth middleware
	authMiddleware := auth.NewMiddleware(jwtService)

	// Initialize session service
	sessionService := auth.NewSessionService(database.DB, jwtService)

	// Set up router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Timeout(30 * time.Second))

	// Set up routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(httprate.LimitByIP(cfg.RateLimitRequests, cfg.RateLimitWindow))
		api.SetupRoutes(r, database, fs, authMiddleware, sessionService)
	})

	// Handle all other routes with static file server
	r.Get("/*", handlers.NewStaticHandler(cfg.StaticPath).ServeHTTP)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
