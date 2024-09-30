package api

import (
	"novamd/internal/db"
	"novamd/internal/filesystem"

	"github.com/go-chi/chi/v5"
)

func SetupRoutes(r chi.Router, db *db.DB, fs *filesystem.FileSystem) {
	r.Route("/", func(r chi.Router) {
		r.Route("/settings", func(r chi.Router) {
			r.Get("/", GetSettings(db))
			r.Post("/", UpdateSettings(db))
		})
		r.Route("/files", func(r chi.Router) {
			r.Get("/", ListFiles(fs))
			r.Get("/*", GetFileContent(fs))
			r.Post("/*", SaveFile(fs))
			r.Delete("/*", DeleteFile(fs))
			r.Get("/lookup", LookupFileByName(fs))
		})
		r.Route("/git", func(r chi.Router) {
			r.Post("/commit", StageCommitAndPush(fs))
			r.Post("/pull", PullChanges(fs))
		})
	})
}
