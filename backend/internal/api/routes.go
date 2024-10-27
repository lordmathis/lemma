package api

import (
	"novamd/internal/db"
	"novamd/internal/filesystem"

	"github.com/go-chi/chi/v5"
)

func SetupRoutes(r chi.Router, db *db.DB, fs *filesystem.FileSystem) {
	r.Route("/", func(r chi.Router) {
		// User routes
		r.Route("/users/{userId}", func(r chi.Router) {
			r.Get("/", GetUser(db))

			// Workspace routes
			r.Route("/workspaces", func(r chi.Router) {
				r.Get("/", ListWorkspaces(db))
				r.Post("/", CreateWorkspace(db))
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
						r.Get("/lookup", LookupFileByName(fs)) // Moved here

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
	})
}
