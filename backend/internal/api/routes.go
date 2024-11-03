package api

import (
	"novamd/internal/auth"
	"novamd/internal/db"
	"novamd/internal/filesystem"

	"github.com/go-chi/chi/v5"
)

func SetupRoutes(r chi.Router, db *db.DB, fs *filesystem.FileSystem, authMiddleware *auth.Middleware, sessionService *auth.SessionService) {

	handler := &BaseHandler{
		DB: db,
		FS: fs,
	}

	// Public routes (no authentication required)
	r.Group(func(r chi.Router) {
		r.Post("/auth/login", Login(sessionService, db))
		r.Post("/auth/refresh", RefreshToken(sessionService))
	})

	// Protected routes (authentication required)
	r.Group(func(r chi.Router) {
		// Apply authentication middleware to all routes in this group
		r.Use(authMiddleware.Authenticate)
		r.Use(WithHandlerContext(db))

		// Auth routes
		r.Post("/auth/logout", Logout(sessionService))
		r.Get("/auth/me", handler.GetCurrentUser(db))

		// Admin-only routes
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.RequireRole("admin"))
			// r.Get("/admin/users", ListUsers(db))
			// r.Post("/admin/users", CreateUser(db))
			// r.Delete("/admin/users/{userId}", DeleteUser(db))
		})

		// Workspace routes
		r.Route("/workspaces", func(r chi.Router) {
			r.Get("/", handler.ListWorkspaces(db))
			r.Post("/", handler.CreateWorkspace(db, fs))
			r.Get("/last", handler.GetLastWorkspace(db))
			r.Put("/last", handler.UpdateLastWorkspace(db))

			// Single workspace routes
			r.Route("/{workspaceId}", func(r chi.Router) {
				r.Use(authMiddleware.RequireWorkspaceOwnership(db))

				r.Get("/", handler.GetWorkspace(db))
				r.Put("/", handler.UpdateWorkspace(db, fs))
				r.Delete("/", handler.DeleteWorkspace(db))

				// File routes
				r.Route("/files", func(r chi.Router) {
					r.Get("/", handler.ListFiles(fs))
					r.Get("/last", handler.GetLastOpenedFile(db, fs))
					r.Put("/last", handler.UpdateLastOpenedFile(db, fs))
					r.Get("/lookup", handler.LookupFileByName(fs))

					r.Post("/*", handler.SaveFile(fs))
					r.Get("/*", handler.GetFileContent(fs))
					r.Delete("/*", handler.DeleteFile(fs))
				})

				// Git routes
				r.Route("/git", func(r chi.Router) {
					r.Post("/commit", handler.StageCommitAndPush(fs))
					r.Post("/pull", handler.PullChanges(fs))
				})
			})
		})
	})
}
