package api

import (
	"encoding/json"
	"net/http"

	"novamd/internal/db"
	"novamd/internal/filesystem"
	"novamd/internal/models"
)

func (h *BaseHandler) ListWorkspaces(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		workspaces, err := db.GetWorkspacesByUserID(ctx.UserID)
		if err != nil {
			http.Error(w, "Failed to list workspaces", http.StatusInternalServerError)
			return
		}

		respondJSON(w, workspaces)
	}
}

func (h *BaseHandler) CreateWorkspace(db *db.DB, fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		var workspace models.Workspace
		if err := json.NewDecoder(r.Body).Decode(&workspace); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		workspace.UserID = ctx.UserID
		if err := db.CreateWorkspace(&workspace); err != nil {
			http.Error(w, "Failed to create workspace", http.StatusInternalServerError)
			return
		}

		if err := fs.InitializeUserWorkspace(workspace.UserID, workspace.ID); err != nil {
			http.Error(w, "Failed to initialize workspace directory", http.StatusInternalServerError)
			return
		}

		respondJSON(w, workspace)
	}
}

func (h *BaseHandler) GetWorkspace(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		respondJSON(w, ctx.Workspace)
	}
}

func gitSettingsChanged(new, old *models.Workspace) bool {
	// Check if Git was enabled/disabled
	if new.GitEnabled != old.GitEnabled {
		return true
	}

	// If Git is enabled, check if any settings changed
	if new.GitEnabled {
		return new.GitURL != old.GitURL ||
			new.GitUser != old.GitUser ||
			new.GitToken != old.GitToken
	}

	return false
}

func (h *BaseHandler) UpdateWorkspace(db *db.DB, fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		var workspace models.Workspace
		if err := json.NewDecoder(r.Body).Decode(&workspace); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Set IDs from the request
		workspace.ID = ctx.Workspace.ID
		workspace.UserID = ctx.UserID

		// Validate the workspace
		if err := workspace.Validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Handle Git repository setup/teardown if Git settings changed
		if gitSettingsChanged(&workspace, ctx.Workspace) {
			if workspace.GitEnabled {
				if err := fs.SetupGitRepo(
					ctx.UserID,
					ctx.Workspace.ID,
					workspace.GitURL,
					workspace.GitUser,
					workspace.GitToken,
				); err != nil {
					http.Error(w, "Failed to setup git repo: "+err.Error(), http.StatusInternalServerError)
					return
				}

			} else {
				fs.DisableGitRepo(ctx.UserID, ctx.Workspace.ID)
			}
		}

		if err := db.UpdateWorkspace(&workspace); err != nil {
			http.Error(w, "Failed to update workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, workspace)
	}
}

func (h *BaseHandler) DeleteWorkspace(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		// Check if this is the user's last workspace
		workspaces, err := db.GetWorkspacesByUserID(ctx.UserID)
		if err != nil {
			http.Error(w, "Failed to get workspaces", http.StatusInternalServerError)
			return
		}

		if len(workspaces) <= 1 {
			http.Error(w, "Cannot delete the last workspace", http.StatusBadRequest)
			return
		}

		// Find another workspace to set as last
		var nextWorkspaceID int
		for _, ws := range workspaces {
			if ws.ID != ctx.Workspace.ID {
				nextWorkspaceID = ws.ID
				break
			}
		}

		// Start transaction
		tx, err := db.Begin()
		if err != nil {
			http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		// Update last workspace ID first
		err = db.UpdateLastWorkspaceTx(tx, ctx.UserID, nextWorkspaceID)
		if err != nil {
			http.Error(w, "Failed to update last workspace", http.StatusInternalServerError)
			return
		}

		// Delete the workspace
		err = db.DeleteWorkspaceTx(tx, ctx.Workspace.ID)
		if err != nil {
			http.Error(w, "Failed to delete workspace", http.StatusInternalServerError)
			return
		}

		// Commit transaction
		if err = tx.Commit(); err != nil {
			http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
			return
		}

		// Return the next workspace ID in the response so frontend knows where to redirect
		respondJSON(w, map[string]int{"nextWorkspaceId": nextWorkspaceID})
	}
}

func (h *BaseHandler) GetLastWorkspace(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		workspaceID, err := db.GetLastWorkspaceID(ctx.UserID)
		if err != nil {
			http.Error(w, "Failed to get last workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]int{"lastWorkspaceId": workspaceID})
	}
}

func (h *BaseHandler) UpdateLastWorkspace(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		var requestBody struct {
			WorkspaceID int `json:"workspaceId"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if err := db.UpdateLastWorkspace(ctx.UserID, requestBody.WorkspaceID); err != nil {
			http.Error(w, "Failed to update last workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "Last workspace updated successfully"})
	}
}
