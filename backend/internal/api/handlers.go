package api

import (
	"encoding/json"
	"io"
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

func SaveFile(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		filePath := strings.TrimPrefix(r.URL.Path, "/api/v1/files/")
		content, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read request body", http.StatusBadRequest)
			return
		}

		err = fs.SaveFile(filePath, content)
		if err != nil {
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("File saved successfully"))
	}
}

func DeleteFile(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		filePath := strings.TrimPrefix(r.URL.Path, "/api/v1/files/")
		err := fs.DeleteFile(filePath)
		if err != nil {
			http.Error(w, "Failed to delete file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("File deleted successfully"))
	}
}
