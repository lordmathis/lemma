package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"novamd/internal/filesystem"
)

func ListFiles(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		files, err := fs.ListFilesRecursively()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(files)
	}
}

func GetFileContent(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		filePath := strings.TrimPrefix(r.URL.Path, "/api/v1/files/")
		content, err := fs.GetFileContent(filePath)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "text/plain")
		w.Write(content)
	}
}
