package api

import (
	"novamd/internal/auth"
	"novamd/internal/db"
	"novamd/internal/filesystem"
	"novamd/internal/handlers"
	"novamd/internal/middleware"

	"github.com/go-chi/chi/v5"
)

func SetupRoutes(r chi.Router, db *db.DB, fs *filesystem.FileSystem, authMiddleware *auth.Middleware, sessionService *auth.SessionService) {

	handler := &handlers.Handler{
		DB: db,
		FS: fs,
	}

	// Public routes (no authentication required)
	r.Group(func(r chi.Router) {
		r.Post("/auth/login", handler.Login(sessionService))
		r.Post("/auth/refresh", handler.RefreshToken(sessionService))
	})

	// Protected routes (authentication required)
	r.Group(func(r chi.Router) {
		// Apply authentication middleware to all routes in this group
		r.Use(authMiddleware.Authenticate)
		r.Use(middleware.WithUserContext)

		// Auth routes
		r.Post("/auth/logout", handler.Logout(sessionService))
		r.Get("/auth/me", handler.GetCurrentUser())

		// Admin-only routes
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.RequireRole("admin"))
			// r.Get("/admin/users", ListUsers(db))
			// r.Post("/admin/users", CreateUser(db))
			// r.Delete("/admin/users/{userId}", DeleteUser(db))
		})

		// Workspace routes
		r.Route("/workspaces", func(r chi.Router) {
			r.Get("/", handler.ListWorkspaces())
			r.Post("/", handler.CreateWorkspace())
			r.Get("/last", handler.GetLastWorkspaceName())
			r.Put("/last", handler.UpdateLastWorkspaceName())

			// Single workspace routes
			r.Route("/{workspaceName}", func(r chi.Router) {
				r.Use(middleware.WithWorkspaceContext(db))
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
}
