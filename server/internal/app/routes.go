package app

import (
	"novamd/internal/auth"
	"novamd/internal/context"
	"novamd/internal/handlers"
	"novamd/internal/logging"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/unrolled/secure"

	httpSwagger "github.com/swaggo/http-swagger"

	_ "novamd/docs" // Swagger docs
)

// setupRouter creates and configures the chi router with middleware and routes
func setupRouter(o Options) *chi.Mux {
	logging.Debug("Setting up router")
	r := chi.NewRouter()

	// Basic middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Timeout(30 * time.Second))

	// Security headers
	logging.Debug("Setting up security headers")
	r.Use(secure.New(secure.Options{
		SSLRedirect:     false,
		SSLProxyHeaders: map[string]string{"X-Forwarded-Proto": "https"},
		IsDevelopment:   o.Config.IsDevelopment,
	}).Handler)

	// CORS if origins are configured
	logging.Debug("Setting up CORS")
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
	logging.Debug("Setting up authentication middleware")
	authMiddleware := auth.NewMiddleware(o.JWTManager, o.SessionManager, o.CookieService)
	handler := &handlers.Handler{
		DB:      o.Database,
		Storage: o.Storage,
	}

	if o.Config.IsDevelopment {
		logging.Debug("Setting up Swagger docs")
		r.Get("/swagger/*", httpSwagger.Handler(
			httpSwagger.URL("/swagger/doc.json"), // The URL pointing to API definition
		))
	}

	// API routes
	logging.Debug("Setting up API routes")
	r.Route("/api/v1", func(r chi.Router) {
		// Rate limiting for API routes
		if o.Config.RateLimitRequests > 0 {
			r.Use(httprate.LimitByIP(
				o.Config.RateLimitRequests,
				o.Config.RateLimitWindow,
			))
		}

		// Public routes (no authentication required)
		r.Group(func(r chi.Router) {
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
				r.Get("/last", handler.GetLastWorkspaceName())
				r.Put("/last", handler.UpdateLastWorkspaceName())

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

						r.Post("/*", handler.SaveFile())
						r.Get("/*", handler.GetFileContent())
						r.Delete("/*", handler.DeleteFile())
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
	logging.Debug("Setting up static file server")
	r.Get("/*", handlers.NewStaticHandler(o.Config.StaticPath).ServeHTTP)

	return r
}
