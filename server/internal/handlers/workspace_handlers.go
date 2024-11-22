package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"novamd/internal/context"
	"novamd/internal/models"
)

func (h *Handler) ListWorkspaces() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		workspaces, err := h.DB.GetWorkspacesByUserID(ctx.UserID)
		if err != nil {
			http.Error(w, "Failed to list workspaces", http.StatusInternalServerError)
			return
		}

		respondJSON(w, workspaces)
	}
}

func (h *Handler) CreateWorkspace() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		var workspace models.Workspace
		if err := json.NewDecoder(r.Body).Decode(&workspace); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		workspace.UserID = ctx.UserID
		if err := h.DB.CreateWorkspace(&workspace); err != nil {
			http.Error(w, "Failed to create workspace", http.StatusInternalServerError)
			return
		}

		if err := h.Storage.InitializeUserWorkspace(workspace.UserID, workspace.ID); err != nil {
			http.Error(w, "Failed to initialize workspace directory", http.StatusInternalServerError)
			return
		}

		respondJSON(w, workspace)
	}
}

func (h *Handler) GetWorkspace() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
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

func (h *Handler) UpdateWorkspace() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
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
				if err := h.Storage.SetupGitRepo(
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
				h.Storage.DisableGitRepo(ctx.UserID, ctx.Workspace.ID)
			}
		}

		if err := h.DB.UpdateWorkspace(&workspace); err != nil {
			http.Error(w, "Failed to update workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, workspace)
	}
}

func (h *Handler) DeleteWorkspace() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		// Check if this is the user's last workspace
		workspaces, err := h.DB.GetWorkspacesByUserID(ctx.UserID)
		if err != nil {
			http.Error(w, "Failed to get workspaces", http.StatusInternalServerError)
			return
		}

		if len(workspaces) <= 1 {
			http.Error(w, "Cannot delete the last workspace", http.StatusBadRequest)
			return
		}

		// Find another workspace to set as last
		var nextWorkspaceName string
		var nextWorkspaceID int
		for _, ws := range workspaces {
			if ws.ID != ctx.Workspace.ID {
				nextWorkspaceID = ws.ID
				nextWorkspaceName = ws.Name
				break
			}
		}

		// Start transaction
		tx, err := h.DB.Begin()
		if err != nil {
			http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		// Update last workspace ID first
		err = h.DB.UpdateLastWorkspaceTx(tx, ctx.UserID, nextWorkspaceID)
		if err != nil {
			http.Error(w, "Failed to update last workspace", http.StatusInternalServerError)
			return
		}

		// Delete the workspace
		err = h.DB.DeleteWorkspaceTx(tx, ctx.Workspace.ID)
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
		respondJSON(w, map[string]string{"nextWorkspaceName": nextWorkspaceName})
	}
}

func (h *Handler) GetLastWorkspaceName() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		workspaceName, err := h.DB.GetLastWorkspaceName(ctx.UserID)
		if err != nil {
			http.Error(w, "Failed to get last workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"lastWorkspaceName": workspaceName})
	}
}

func (h *Handler) UpdateLastWorkspaceName() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		var requestBody struct {
			WorkspaceName string `json:"workspaceName"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			fmt.Println(err)
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if err := h.DB.UpdateLastWorkspace(ctx.UserID, requestBody.WorkspaceName); err != nil {
			fmt.Println(err)
			http.Error(w, "Failed to update last workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "Last workspace updated successfully"})
	}
}
