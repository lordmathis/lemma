package api

import (
	"encoding/json"
	"errors"
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
		userID, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		files, err := fs.ListFilesRecursively(userID, workspaceID)
		if err != nil {
			http.Error(w, "Failed to list files", http.StatusInternalServerError)
			return
		}

		respondJSON(w, files)
	}
}

func LookupFileByName(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		filename := r.URL.Query().Get("filename")
		if filename == "" {
			http.Error(w, "Filename is required", http.StatusBadRequest)
			return
		}

		filePaths, err := fs.FindFileByName(userID, workspaceID, filename)
		if err != nil {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		respondJSON(w, map[string][]string{"paths": filePaths})
	}
}

func GetFileContent(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		filePath := strings.TrimPrefix(r.URL.Path, "/api/v1/files/")
		content, err := fs.GetFileContent(userID, workspaceID, filePath)
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
		userID, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		filePath := strings.TrimPrefix(r.URL.Path, "/api/v1/files/")
		content, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read request body", http.StatusBadRequest)
			return
		}

		err = fs.SaveFile(userID, workspaceID, filePath, content)
		if err != nil {
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "File saved successfully"})
	}
}

func DeleteFile(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		filePath := strings.TrimPrefix(r.URL.Path, "/api/v1/files/")
		err = fs.DeleteFile(userID, workspaceID, filePath)
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
		_, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		settings, err := db.GetWorkspaceSettings(workspaceID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		respondJSON(w, settings)
	}
}

func UpdateSettings(db *db.DB, fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		var settings models.WorkspaceSettings
		if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		settings.WorkspaceID = workspaceID

		if err := db.SaveWorkspaceSettings(&settings); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if settings.Settings.GitEnabled {
			err := fs.SetupGitRepo(userID, workspaceID, settings.Settings.GitURL, settings.Settings.GitUser, settings.Settings.GitToken)
			if err != nil {
				http.Error(w, "Failed to setup git repo", http.StatusInternalServerError)
				return
			}
		} else {
			fs.DisableGitRepo(userID, workspaceID)
		}

		respondJSON(w, settings)
	}
}

func StageCommitAndPush(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		var requestBody struct {
			Message string `json:"message"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if requestBody.Message == "" {
			http.Error(w, "Commit message is required", http.StatusBadRequest)
			return
		}

		err = fs.StageCommitAndPush(userID, workspaceID, requestBody.Message)
		if err != nil {
			http.Error(w, "Failed to stage, commit, and push changes: "+err.Error(), http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "Changes staged, committed, and pushed successfully"})
	}
}

func PullChanges(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		err = fs.Pull(userID, workspaceID)
		if err != nil {
			http.Error(w, "Failed to pull changes: "+err.Error(), http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "Pulled changes from remote"})
	}
}

func getUserAndWorkspaceIDs(r *http.Request) (int, int, error) {
	userID, err := strconv.Atoi(r.URL.Query().Get("userId"))
	if err != nil {
		return 0, 0, errors.New("invalid userId")
	}

	workspaceID, err := strconv.Atoi(r.URL.Query().Get("workspaceId"))
	if err != nil {
		return 0, 0, errors.New("invalid workspaceId")
	}

	return userID, workspaceID, nil
}

func respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}