package api

import (
	"encoding/json"
	"net/http"

	"novamd/internal/db"
	"novamd/internal/filesystem"
	"novamd/internal/models"
)

func ListWorkspaces(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := getUserID(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		workspaces, err := db.GetWorkspacesByUserID(userID)
		if err != nil {
			http.Error(w, "Failed to list workspaces", http.StatusInternalServerError)
			return
		}

		respondJSON(w, workspaces)
	}
}

func CreateWorkspace(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := getUserID(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		var workspace models.Workspace
		if err := json.NewDecoder(r.Body).Decode(&workspace); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		workspace.UserID = userID
		if err := db.CreateWorkspace(&workspace); err != nil {
			http.Error(w, "Failed to create workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, workspace)
	}
}

func GetWorkspace(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		workspace, err := db.GetWorkspaceByID(workspaceID)
		if err != nil {
			http.Error(w, "Workspace not found", http.StatusNotFound)
			return
		}

		if workspace.UserID != userID {
			http.Error(w, "Unauthorized access to workspace", http.StatusForbidden)
			return
		}

		respondJSON(w, workspace)
	}
}

func UpdateWorkspace(db *db.DB, fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		var workspace models.Workspace
		if err := json.NewDecoder(r.Body).Decode(&workspace); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Set IDs from the request
		workspace.ID = workspaceID
		workspace.UserID = userID

		// Validate the workspace
		if err := workspace.Validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Get current workspace for comparison
		currentWorkspace, err := db.GetWorkspaceByID(workspaceID)
		if err != nil {
			http.Error(w, "Workspace not found", http.StatusNotFound)
			return
		}

		if currentWorkspace.UserID != userID {
			http.Error(w, "Unauthorized access to workspace", http.StatusForbidden)
			return
		}

		// Handle Git repository setup/teardown if Git settings changed
		if workspace.GitEnabled != currentWorkspace.GitEnabled ||
			(workspace.GitEnabled && (workspace.GitURL != currentWorkspace.GitURL ||
				workspace.GitUser != currentWorkspace.GitUser ||
				workspace.GitToken != currentWorkspace.GitToken)) {
			if workspace.GitEnabled {
				err = fs.SetupGitRepo(userID, workspaceID, workspace.GitURL, workspace.GitUser, workspace.GitToken)
				if err != nil {
					http.Error(w, "Failed to setup git repo: "+err.Error(), http.StatusInternalServerError)
					return
				}
			} else {
				fs.DisableGitRepo(userID, workspaceID)
			}
		}

		if err := db.UpdateWorkspace(&workspace); err != nil {
			http.Error(w, "Failed to update workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, workspace)
	}
}

func DeleteWorkspace(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, workspaceID, err := getUserAndWorkspaceIDs(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		workspace, err := db.GetWorkspaceByID(workspaceID)
		if err != nil {
			http.Error(w, "Workspace not found", http.StatusNotFound)
			return
		}

		if workspace.UserID != userID {
			http.Error(w, "Unauthorized access to workspace", http.StatusForbidden)
			return
		}

		if err := db.DeleteWorkspace(workspaceID); err != nil {
			http.Error(w, "Failed to delete workspace", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Workspace deleted successfully"))
	}
}

func GetLastWorkspace(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := getUserID(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		workspaceID, err := db.GetLastWorkspaceID(userID)
		if err != nil {
			http.Error(w, "Failed to get last workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]int{"lastWorkspaceId": workspaceID})
	}
}

func UpdateLastWorkspace(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := getUserID(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		var requestBody struct {
			WorkspaceID int `json:"workspaceId"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if err := db.UpdateLastWorkspace(userID, requestBody.WorkspaceID); err != nil {
			http.Error(w, "Failed to update last workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "Last workspace updated successfully"})
	}
}
