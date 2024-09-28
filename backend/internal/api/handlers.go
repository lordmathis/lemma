package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"novamd/internal/db"
	"novamd/internal/filesystem"
	"novamd/internal/models"
)

func ListFiles(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		files, err := fs.ListFilesRecursively()
		if err != nil {
			http.Error(w, "Failed to list files", http.StatusInternalServerError)
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
			http.Error(w, "Failed to read file", http.StatusNotFound)
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

		json.NewEncoder(w).Encode(settings)
	}
}

func UpdateSettings(db *db.DB) http.HandlerFunc {
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

		// Fetch the saved settings to return
		savedSettings, err := db.GetSettings(settings.UserID)
		if err != nil {
			http.Error(w, "Settings saved but could not be retrieved", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(savedSettings)
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

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Changes staged, committed, and pushed successfully"))
	}
}

func PullChanges(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		err := fs.Pull()
		if err != nil {
			http.Error(w, "Failed to pull changes: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Pulled changes from remote"})
	}
}
