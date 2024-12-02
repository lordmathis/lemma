package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"novamd/internal/context"
	"novamd/internal/models"
)

// ListWorkspaces godoc
// @Summary List workspaces
// @Description Lists all workspaces for the current user
// @Tags workspaces
// @ID listWorkspaces
// @Security BearerAuth
// @Produce json
// @Success 200 {array} models.Workspace
// @Failure 500 {string} string "Failed to list workspaces"
// @Router /workspaces [get]
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

// CreateWorkspace godoc
// @Summary Create workspace
// @Description Creates a new workspace
// @Tags workspaces
// @ID createWorkspace
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param body body models.Workspace true "Workspace"
// @Success 200 {object} models.Workspace
// @Failure 400 {string} string "Invalid request body"
// @Failure 400 {string} string "Invalid workspace"
// @Failure 500 {string} string "Failed to create workspace"
// @Failure 500 {string} string "Failed to initialize workspace directory"
// @Failure 500 {string} string "Failed to setup git repo"
// @Router /workspaces [post]
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

		if err := workspace.ValidateGitSettings(); err != nil {
			http.Error(w, "Invalid workspace", http.StatusBadRequest)
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

		if workspace.GitEnabled {
			if err := h.Storage.SetupGitRepo(
				ctx.UserID,
				workspace.ID,
				workspace.GitURL,
				workspace.GitUser,
				workspace.GitToken,
				workspace.GitCommitName,
				workspace.GitCommitEmail,
			); err != nil {
				http.Error(w, "Failed to setup git repo: "+err.Error(), http.StatusInternalServerError)
				return
			}
		}

		respondJSON(w, workspace)
	}
}

// GetWorkspace godoc
// @Summary Get workspace
// @Description Returns the current workspace
// @Tags workspaces
// @ID getWorkspace
// @Security BearerAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Success 200 {object} models.Workspace
// @Failure 500 {string} string "Failed to get workspace"
// @Router /workspaces/{workspace_name} [get]
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
			new.GitToken != old.GitToken ||
			new.GitCommitName != old.GitCommitName ||
			new.GitCommitEmail != old.GitCommitEmail
	}

	return false
}

// UpdateWorkspace godoc
// @Summary Update workspace
// @Description Updates the current workspace
// @Tags workspaces
// @ID updateWorkspace
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Param body body models.Workspace true "Workspace"
// @Success 200 {object} models.Workspace
// @Failure 400 {string} string "Invalid request body"
// @Failure 500 {string} string "Failed to update workspace"
// @Failure 500 {string} string "Failed to setup git repo"
// @Router /workspaces/{workspace_name} [put]
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
					workspace.GitCommitName,
					workspace.GitCommitEmail,
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

// DeleteWorkspace godoc
// @Summary Delete workspace
// @Description Deletes the current workspace
// @Tags workspaces
// @ID deleteWorkspace
// @Security BearerAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Success 200 {object} map[string]string
// @Failure 400 {string} string "Cannot delete the last workspace"
// @Failure 500 {string} string "Failed to get workspaces"
// @Failure 500 {string} string "Failed to start transaction"
// @Failure 500 {string} string "Failed to update last workspace"
// @Failure 500 {string} string "Failed to delete workspace"
// @Failure 500 {string} string "Failed to rollback transaction"
// @Failure 500 {string} string "Failed to commit transaction"
// @Router /workspaces/{workspace_name} [delete]
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
		defer func() {
			if err := tx.Rollback(); err != nil && err != sql.ErrTxDone {
				http.Error(w, "Failed to rollback transaction", http.StatusInternalServerError)
			}
		}()

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

// GetLastWorkspaceName godoc
// @Summary Get last workspace name
// @Description Returns the name of the last opened workspace
// @Tags workspaces
// @ID getLastWorkspaceName
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 500 {string} string "Failed to get last workspace"
// @Router /workspaces/last [get]
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

// UpdateLastWorkspaceName godoc
// @Summary Update last workspace name
// @Description Updates the name of the last opened workspace
// @Tags workspaces
// @ID updateLastWorkspaceName
// @Security BearerAuth
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 400 {string} string "Invalid request body"
// @Failure 500 {string} string "Failed to update last workspace"
// @Router /workspaces/last [put]
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
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if err := h.DB.UpdateLastWorkspace(ctx.UserID, requestBody.WorkspaceName); err != nil {
			http.Error(w, "Failed to update last workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "Last workspace updated successfully"})
	}
}
