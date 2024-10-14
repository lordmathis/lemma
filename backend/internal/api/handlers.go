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
		workspaceID, err := strconv.Atoi(r.URL.Query().Get("workspaceId"))
		if err != nil {
			http.Error(w, "Invalid workspaceId", http.StatusBadRequest)
			return
		}

		files, err := fs.ListFilesRecursively(workspaceID)
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
		workspaceID, err := strconv.Atoi(r.URL.Query().Get("workspaceId"))
		if err != nil {
			http.Error(w, "Invalid workspaceId", http.StatusBadRequest)
			return
		}

		filenameOrPath := r.URL.Query().Get("filename")
		if filenameOrPath == "" {
			http.Error(w, "Filename or path is required", http.StatusBadRequest)
			return
		}

		filePaths, err := fs.FindFileByName(workspaceID, filenameOrPath)
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
		workspaceID, err := strconv.Atoi(r.URL.Query().Get("workspaceId"))
		if err != nil {
			http.Error(w, "Invalid workspaceId", http.StatusBadRequest)
			return
		}

		filePath := strings.TrimPrefix(r.URL.Path, "/api/v1/files/")
		content, err := fs.GetFileContent(workspaceID, filePath)
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
		workspaceID, err := strconv.Atoi(r.URL.Query().Get("workspaceId"))
		if err != nil {
			http.Error(w, "Invalid workspaceId", http.StatusBadRequest)
			return
		}

		filePath := strings.TrimPrefix(r.URL.Path, "/api/v1/files/")
		content, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read request body", http.StatusBadRequest)
			return
		}

		err = fs.SaveFile(workspaceID, filePath, content)
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
		workspaceID, err := strconv.Atoi(r.URL.Query().Get("workspaceId"))
		if err != nil {
			http.Error(w, "Invalid workspaceId", http.StatusBadRequest)
			return
		}

		filePath := strings.TrimPrefix(r.URL.Path, "/api/v1/files/")
		err = fs.DeleteFile(workspaceID, filePath)
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
		workspaceID, err := strconv.Atoi(r.URL.Query().Get("workspaceId"))
		if err != nil {
			http.Error(w, "Invalid workspaceId", http.StatusBadRequest)
			return
		}

		settings, err := db.GetWorkspaceSettings(workspaceID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(settings); err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		}
	}
}

func UpdateSettings(db *db.DB, fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var settings models.WorkspaceSettings
		if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if err := settings.Validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		err := db.SaveWorkspaceSettings(settings)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if settings.Settings.GitEnabled {
			err := fs.SetupGitRepo(settings.WorkspaceID, settings.Settings.GitURL, settings.Settings.GitUser, settings.Settings.GitToken)
			if err != nil {
				http.Error(w, "Failed to setup git repo", http.StatusInternalServerError)
				return
			}
		} else {
			fs.DisableGitRepo(settings.WorkspaceID)
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(settings); err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		}
	}
}

func StageCommitAndPush(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		workspaceID, err := strconv.Atoi(r.URL.Query().Get("workspaceId"))
		if err != nil {
			http.Error(w, "Invalid workspaceId", http.StatusBadRequest)
			return
		}

		var requestBody struct {
			Message string `json:"message"`
		}

		err = json.NewDecoder(r.Body).Decode(&requestBody)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if requestBody.Message == "" {
			http.Error(w, "Commit message is required", http.StatusBadRequest)
			return
		}

		err = fs.StageCommitAndPush(workspaceID, requestBody.Message)
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
	return func(w http.ResponseWriter, r *http.Request) {
		workspaceID, err := strconv.Atoi(r.URL.Query().Get("workspaceId"))
		if err != nil {
			http.Error(w, "Invalid workspaceId", http.StatusBadRequest)
			return
		}

		err = fs.Pull(workspaceID)
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