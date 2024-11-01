package api

import (
	"novamd/internal/auth"
	"novamd/internal/db"
	"novamd/internal/filesystem"
	"novamd/internal/models"

	"github.com/go-chi/chi/v5"
)

func SetupRoutes(r chi.Router, db *db.DB, fs *filesystem.FileSystem, authMiddleware *auth.Middleware, sessionService *auth.SessionService) {
	// Public routes (no authentication required)
	r.Group(func(r chi.Router) {
		r.Post("/auth/login", Login(sessionService, db))
		r.Post("/auth/refresh", RefreshToken(sessionService))
	})

	// Protected routes (authentication required)
	r.Group(func(r chi.Router) {
		// Apply authentication middleware to all routes in this group
		r.Use(authMiddleware.Authenticate)

		// Auth routes
		r.Post("/auth/logout", Logout(sessionService))
		r.Get("/auth/me", GetCurrentUser(db))

		// User routes
		r.Route("/users/{userId}", func(r chi.Router) {
			r.Get("/", GetUser(db))

			// Workspace routes
			r.Route("/workspaces", func(r chi.Router) {
				r.Get("/", ListWorkspaces(db))
				r.Post("/", CreateWorkspace(db, fs))
				r.Get("/last", GetLastWorkspace(db))
				r.Put("/last", UpdateLastWorkspace(db))

				r.Route("/{workspaceId}", func(r chi.Router) {
					r.Get("/", GetWorkspace(db))
					r.Put("/", UpdateWorkspace(db, fs))
					r.Delete("/", DeleteWorkspace(db))

					// File routes
					r.Route("/files", func(r chi.Router) {
						r.Get("/", ListFiles(fs))
						r.Get("/last", GetLastOpenedFile(db))
						r.Put("/last", UpdateLastOpenedFile(db, fs))
						r.Get("/lookup", LookupFileByName(fs))

						r.Post("/*", SaveFile(fs))
						r.Get("/*", GetFileContent(fs))
						r.Delete("/*", DeleteFile(fs))
					})

					// Git routes
					r.Route("/git", func(r chi.Router) {
						r.Post("/commit", StageCommitAndPush(fs))
						r.Post("/pull", PullChanges(fs))
					})
				})
			})
		})

		// Admin-only routes
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.RequireRole(string(models.RoleAdmin)))
			// Admin-only endpoints
		})
	})
}
