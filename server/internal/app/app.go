// Package app provides application-level functionality for initializing and running the server
package app

import (
	"fmt"
	"log"
	"net/http"
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
	"novamd/internal/secrets"
	"novamd/internal/storage"
)

// Server represents the HTTP server and its dependencies
type Server struct {
	router  *chi.Mux
	config  *config.Config
	db      db.Database
	storage storage.Manager
}

// NewServer initializes a new server instance with all dependencies
func NewServer(cfg *config.Config) (*Server, error) {
	// Initialize secrets service
	secretsService, err := secrets.NewService(cfg.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize secrets service: %w", err)
	}

	// Initialize database
	database, err := initDatabase(cfg, secretsService)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	// Initialize filesystem
	storageManager := storage.NewService(cfg.WorkDir)

	// Initialize router
	router := initRouter(cfg)

	return &Server{
		router:  router,
		config:  cfg,
		db:      database,
		storage: storageManager,
	}, nil
}

// Start configures and starts the HTTP server
func (s *Server) Start() error {
	// Set up authentication
	jwtManager, sessionService, err := s.setupAuth()
	if err != nil {
		return fmt.Errorf("failed to setup authentication: %w", err)
	}

	// Set up routes
	s.setupRoutes(jwtManager, sessionService)

	// Start server
	addr := ":" + s.config.Port
	log.Printf("Server starting on port %s", s.config.Port)
	return http.ListenAndServe(addr, s.router)
}

// Close handles graceful shutdown of server dependencies
func (s *Server) Close() error {
	return s.db.Close()
}

// initDatabase initializes and migrates the database
func initDatabase(cfg *config.Config, secretsService secrets.Service) (db.Database, error) {
	database, err := db.Init(cfg.DBPath, secretsService)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	if err := database.Migrate(); err != nil {
		return nil, fmt.Errorf("failed to apply database migrations: %w", err)
	}

	return database, nil
}

// initRouter creates and configures the chi router with middleware
func initRouter(cfg *config.Config) *chi.Mux {
	r := chi.NewRouter()

	// Basic middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Timeout(30 * time.Second))

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
			MaxAge:           300,
		}))
	}

	return r
}

// setupAuth initializes JWT and session services
func (s *Server) setupAuth() (auth.JWTManager, *auth.SessionService, error) {
	// Get or generate JWT signing key
	signingKey := s.config.JWTSigningKey
	if signingKey == "" {
		var err error
		signingKey, err = s.db.EnsureJWTSecret()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to ensure JWT secret: %w", err)
		}
	}

	// Initialize JWT service
	jwtManager, err := auth.NewJWTService(auth.JWTConfig{
		SigningKey:         signingKey,
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 7 * 24 * time.Hour,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("failed to initialize JWT service: %w", err)
	}

	// Initialize session service
	sessionService := auth.NewSessionService(s.db, jwtManager)

	return jwtManager, sessionService, nil
}

// setupRoutes configures all application routes
func (s *Server) setupRoutes(jwtManager auth.JWTManager, sessionService *auth.SessionService) {
	// Initialize auth middleware
	authMiddleware := auth.NewMiddleware(jwtManager)

	// Set up API routes
	s.router.Route("/api/v1", func(r chi.Router) {
		r.Use(httprate.LimitByIP(s.config.RateLimitRequests, s.config.RateLimitWindow))
		api.SetupRoutes(r, s.db, s.storage, authMiddleware, sessionService)
	})

	// Handle all other routes with static file server
	s.router.Get("/*", handlers.NewStaticHandler(s.config.StaticPath).ServeHTTP)
}
