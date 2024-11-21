package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"

	"github.com/unrolled/secure"

	"novamd/internal/api"
	"novamd/internal/auth"
	"novamd/internal/config"
	"novamd/internal/db"
	"novamd/internal/handlers"
	"novamd/internal/storage"
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
	s := storage.NewService(cfg.WorkDir)

	// Initialize JWT service
	jwtManager, err := auth.NewJWTService(auth.JWTConfig{
		SigningKey:         signingKey,
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 7 * 24 * time.Hour,
	})
	if err != nil {
		log.Fatal("Failed to initialize JWT service:", err)
	}

	// Initialize auth middleware
	authMiddleware := auth.NewMiddleware(jwtManager)

	// Initialize session service
	sessionService := auth.NewSessionService(database.DB, jwtManager)

	// Set up router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)

	// Security headers
	r.Use(secure.New(secure.Options{
		SSLRedirect:     false, // Let proxy handle HTTPS
		SSLProxyHeaders: map[string]string{"X-Forwarded-Proto": "https"},
		IsDevelopment:   cfg.IsDevelopment,
	}).Handler)

	// CORS if origins are configured
	if len(cfg.CORSOrigins) > 0 {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins:   cfg.CORSOrigins,
			AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Requested-With"},
			AllowCredentials: true,
			MaxAge:           300, // Maximum value not ignored by any major browser
		}))
	}

	r.Use(middleware.Timeout(30 * time.Second))

	// Set up routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(httprate.LimitByIP(cfg.RateLimitRequests, cfg.RateLimitWindow))
		api.SetupRoutes(r, database, s, authMiddleware, sessionService)
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
