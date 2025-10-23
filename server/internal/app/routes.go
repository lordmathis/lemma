package app

import (
	"lemma/internal/auth"
	"lemma/internal/context"
	"lemma/internal/handlers"
	"lemma/internal/logging"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/unrolled/secure"

	httpSwagger "github.com/swaggo/http-swagger"

	_ "lemma/docs" // Swagger docs
)

// setupRouter creates and configures the chi router with middleware and routes
func setupRouter(o Options) *chi.Mux {
	logging.Debug("setting up router")
	r := chi.NewRouter()

	// Basic middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Timeout(30 * time.Second))

	// Security headers
	r.Use(secure.New(secure.Options{
		SSLRedirect:     false,
		SSLProxyHeaders: map[string]string{"X-Forwarded-Proto": "https"},
		IsDevelopment:   o.Config.IsDevelopment,
	}).Handler)

	// CORS if origins are configured
	if len(o.Config.CORSOrigins) > 0 {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins:   o.Config.CORSOrigins,
			AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"Accept", "Content-Type", "X-CSRF-Token"},
			ExposedHeaders:   []string{"X-CSRF-Token"},
			AllowCredentials: true,
			MaxAge:           300,
		}))
	}

	// Initialize auth middleware and handler
	authMiddleware := auth.NewMiddleware(o.JWTManager, o.SessionManager, o.CookieService)
	handler := &handlers.Handler{
		DB:      o.Database,
		Storage: o.Storage,
	}

	if o.Config.IsDevelopment {
		r.Get("/swagger/*", httpSwagger.Handler(
			httpSwagger.URL("/swagger/doc.json"), // The URL pointing to API definition
		))
	}

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public routes (no authentication required)
		r.Group(func(r chi.Router) {
			// Rate limiting for authentication endpoints to prevent brute force attacks
			if o.Config.RateLimitRequests > 0 {
				r.Use(httprate.LimitByIP(
					o.Config.RateLimitRequests,
					o.Config.RateLimitWindow,
				))
			}

			r.Post("/auth/login", handler.Login(o.SessionManager, o.CookieService))
			r.Post("/auth/refresh", handler.RefreshToken(o.SessionManager, o.CookieService))
		})

		// Protected routes (authentication required)
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.Authenticate)
			r.Use(context.WithUserContextMiddleware)

			// Auth routes
			r.Post("/auth/logout", handler.Logout(o.SessionManager, o.CookieService))
			r.Get("/auth/me", handler.GetCurrentUser())

			// User profile routes
			r.Put("/profile", handler.UpdateProfile())
			r.Delete("/profile", handler.DeleteAccount())

			// Admin-only routes
			r.Route("/admin", func(r chi.Router) {
				r.Use(authMiddleware.RequireRole("admin"))
				// User management
				r.Route("/users", func(r chi.Router) {
					r.Get("/", handler.AdminListUsers())
					r.Post("/", handler.AdminCreateUser())
					r.Get("/{userId}", handler.AdminGetUser())
					r.Put("/{userId}", handler.AdminUpdateUser())
					r.Delete("/{userId}", handler.AdminDeleteUser())
				})
				// Workspace management
				r.Route("/workspaces", func(r chi.Router) {
					r.Get("/", handler.AdminListWorkspaces())
				})
				// System stats
				r.Get("/stats", handler.AdminGetSystemStats())
			})

			// Workspace routes
			r.Route("/workspaces", func(r chi.Router) {
				r.Get("/", handler.ListWorkspaces())
				r.Post("/", handler.CreateWorkspace())
				r.Get("/_op/last", handler.GetLastWorkspaceName())
				r.Put("/_op/last", handler.UpdateLastWorkspaceName())

				// Single workspace routes
				r.Route("/{workspaceName}", func(r chi.Router) {
					r.Use(context.WithWorkspaceContextMiddleware(o.Database))
					r.Use(authMiddleware.RequireWorkspaceAccess)

					r.Get("/", handler.GetWorkspace())
					r.Put("/", handler.UpdateWorkspace())
					r.Delete("/", handler.DeleteWorkspace())

					// File routes
					r.Route("/files", func(r chi.Router) {
						r.Get("/", handler.ListFiles())
						r.Get("/last", handler.GetLastOpenedFile())
						r.Put("/last", handler.UpdateLastOpenedFile())
						r.Get("/lookup", handler.LookupFileByName())

						r.Post("/upload", handler.UploadFile())
						r.Post("/move", handler.MoveFile())

						r.Post("/", handler.SaveFile())
						r.Get("/content", handler.GetFileContent())
						r.Delete("/", handler.DeleteFile())
					})

					// Git routes
					r.Route("/git", func(r chi.Router) {
						r.Post("/commit", handler.StageCommitAndPush())
						r.Post("/pull", handler.PullChanges())
					})
				})
			})
		})
	})

	// Handle all other routes with static file server
	staticHandler := handlers.NewStaticHandler(o.Config.StaticPath)
	r.Get("/*", staticHandler.ServeHTTP)
	r.Head("/*", staticHandler.ServeHTTP)

	return r
}
