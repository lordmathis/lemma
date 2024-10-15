package api

import (
	"encoding/json"
	"io"
	"net/http"

	"novamd/internal/db"
	"novamd/internal/filesystem"

	"github.com/go-chi/chi/v5"
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

		filePath := chi.URLParam(r, "*")
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

		filePath := chi.URLParam(r, "*")
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

		filePath := chi.URLParam(r, "*")
		err = fs.DeleteFile(userID, workspaceID, filePath)
		if err != nil {
			http.Error(w, "Failed to delete file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("File deleted successfully"))
	}
}

func GetLastOpenedFile(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, _, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		user, err := db.GetUserByID(userID)
		if err != nil {
			http.Error(w, "Failed to get user", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"lastOpenedFile": user.LastOpenedFilePath})
	}
}

func UpdateLastOpenedFile(db *db.DB, fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		var requestBody struct {
			FilePath string `json:"filePath"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate that the file path is valid within the workspace
		_, err = fs.ValidatePath(userID, workspaceID, requestBody.FilePath)
		if err != nil {
			http.Error(w, "Invalid file path", http.StatusBadRequest)
			return
		}

		if err := db.UpdateLastOpenedFile(userID, requestBody.FilePath); err != nil {
			http.Error(w, "Failed to update last opened file", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "Last opened file updated successfully"})
	}
}
