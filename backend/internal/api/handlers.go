package api

import (
	"encoding/json"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"novamd/internal/db"
	"novamd/internal/filesystem"
	"novamd/internal/models"
)

func ListFiles(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		files, err := fs.ListFilesRecursively()
		if err != nil {
			http.Error(w, "Failed to list files", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(files); err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		}
	}
}

func LookupFileByName(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		filenameOrPath := r.URL.Query().Get("filename")
		if filenameOrPath == "" {
			http.Error(w, "Filename or path is required", http.StatusBadRequest)
			return
		}

		filePaths, err := fs.FindFileByName(filenameOrPath)
		if err != nil {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string][]string{"paths": filePaths}); err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		}
	}
}

func GetFileContent(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		filePath := strings.TrimPrefix(r.URL.Path, "/api/v1/files/")
		content, err := fs.GetFileContent(filePath)
		if err != nil {
			http.Error(w, "Failed to read file", http.StatusNotFound)
			return
		}

		// Determine content type based on file extension
		contentType := "text/plain"
		switch filepath.Ext(filePath) {
		case ".png":
			contentType = "image/png"
		case ".jpg", ".jpeg":
			contentType = "image/jpeg"
		case ".webp":
			contentType = "image/webp"
		case ".gif":
			contentType = "image/gif"
		case ".svg":
			contentType = "image/svg+xml"
		case ".md":
			contentType = "text/markdown"
		}

		w.Header().Set("Content-Type", contentType)
		if _, err := w.Write(content); err != nil {
			http.Error(w, "Failed to write response", http.StatusInternalServerError)
		}
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

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]string{"message": "File saved successfully"}); err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		}
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
		if _, err := w.Write([]byte("File deleted successfully")); err != nil {
			http.Error(w, "Failed to write response", http.StatusInternalServerError)
		}
	}
}

func GetSettings(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userIDStr := r.URL.Query().Get("userId")
		userID, err := strconv.Atoi(userIDStr)
		if err != nil {
			http.Error(w, "Invalid userId", http.StatusBadRequest)
			return
		}

		settings, err := db.GetSettings(userID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		settings.SetDefaults()

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(settings); err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		}
	}
}

func UpdateSettings(db *db.DB, fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var settings models.Settings
		if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		settings.SetDefaults()

		if err := settings.Validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		err := db.SaveSettings(settings)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if settings.Settings.GitEnabled {
			err := fs.SetupGitRepo(settings.Settings.GitURL, settings.Settings.GitUser, settings.Settings.GitToken)
			if err != nil {
				http.Error(w, "Failed to setup git repo", http.StatusInternalServerError)
			}
		} else {
			fs.DisableGitRepo()
		}

		// Fetch the saved settings to return
		savedSettings, err := db.GetSettings(settings.UserID)
		if err != nil {
			http.Error(w, "Settings saved but could not be retrieved", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(savedSettings); err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		}
	}
}

func StageCommitAndPush(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var requestBody struct {
			Message string `json:"message"`
		}

		err := json.NewDecoder(r.Body).Decode(&requestBody)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if requestBody.Message == "" {
			http.Error(w, "Commit message is required", http.StatusBadRequest)
			return
		}

		err = fs.StageCommitAndPush(requestBody.Message)
		if err != nil {
			http.Error(w, "Failed to stage, commit, and push changes: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]string{"message": "Changes staged, committed, and pushed successfully"}); err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		}
	}
}

func PullChanges(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		err := fs.Pull()
		if err != nil {
			http.Error(w, "Failed to pull changes: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(map[string]string{"message": "Pulled changes from remote"}); err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		}
	}
}
