package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"novamd/internal/context"
	"novamd/internal/logging"
	"novamd/internal/models"
)

// DeleteWorkspaceResponse contains the name of the next workspace after deleting the current one
type DeleteWorkspaceResponse struct {
	NextWorkspaceName string `json:"nextWorkspaceName"`
}

// LastWorkspaceNameResponse contains the name of the last opened workspace
type LastWorkspaceNameResponse struct {
	LastWorkspaceName string `json:"lastWorkspaceName"`
}

func getWorkspaceLogger() logging.Logger {
	return getHandlersLogger().WithGroup("workspace")
}

// ListWorkspaces godoc
// @Summary List workspaces
// @Description Lists all workspaces for the current user
// @Tags workspaces
// @ID listWorkspaces
// @Security CookieAuth
// @Produce json
// @Success 200 {array} models.Workspace
// @Failure 500 {object} ErrorResponse "Failed to list workspaces"
// @Router /workspaces [get]
func (h *Handler) ListWorkspaces() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getWorkspaceLogger().With(
			"handler", "ListWorkspaces",
			"userID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		workspaces, err := h.DB.GetWorkspacesByUserID(ctx.UserID)
		if err != nil {
			log.Error("failed to fetch workspaces from database",
				"error", err.Error(),
			)
			respondError(w, "Failed to list workspaces", http.StatusInternalServerError)
			return
		}

		log.Debug("workspaces retrieved successfully",
			"count", len(workspaces),
		)
		respondJSON(w, workspaces)
	}
}

// CreateWorkspace godoc
// @Summary Create workspace
// @Description Creates a new workspace
// @Tags workspaces
// @ID createWorkspace
// @Security CookieAuth
// @Accept json
// @Produce json
// @Param body body models.Workspace true "Workspace"
// @Success 200 {object} models.Workspace
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 400 {object} ErrorResponse "Invalid workspace"
// @Failure 500 {object} ErrorResponse "Failed to create workspace"
// @Failure 500 {object} ErrorResponse "Failed to initialize workspace directory"
// @Failure 500 {object} ErrorResponse "Failed to setup git repo"
// @Router /workspaces [post]
func (h *Handler) CreateWorkspace() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getWorkspaceLogger().With(
			"handler", "CreateWorkspace",
			"userID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		var workspace models.Workspace
		if err := json.NewDecoder(r.Body).Decode(&workspace); err != nil {
			log.Debug("invalid request body received",
				"error", err.Error(),
			)
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if err := workspace.ValidateGitSettings(); err != nil {
			log.Debug("invalid git settings provided",
				"error", err.Error(),
			)
			respondError(w, "Invalid workspace", http.StatusBadRequest)
			return
		}

		workspace.UserID = ctx.UserID
		if err := h.DB.CreateWorkspace(&workspace); err != nil {
			log.Error("failed to create workspace in database",
				"error", err.Error(),
				"workspaceName", workspace.Name,
			)
			respondError(w, "Failed to create workspace", http.StatusInternalServerError)
			return
		}

		if err := h.Storage.InitializeUserWorkspace(workspace.UserID, workspace.ID); err != nil {
			log.Error("failed to initialize workspace directory",
				"error", err.Error(),
				"workspaceID", workspace.ID,
			)
			respondError(w, "Failed to initialize workspace directory", http.StatusInternalServerError)
			return
		}

		if workspace.GitEnabled {
			log.Debug("setting up git repository",
				"workspaceID", workspace.ID,
				"gitURL", workspace.GitURL,
			)

			if err := h.Storage.SetupGitRepo(
				ctx.UserID,
				workspace.ID,
				workspace.GitURL,
				workspace.GitUser,
				workspace.GitToken,
				workspace.GitCommitName,
				workspace.GitCommitEmail,
			); err != nil {
				log.Error("failed to setup git repository",
					"error", err.Error(),
					"workspaceID", workspace.ID,
				)
				respondError(w, "Failed to setup git repo: "+err.Error(), http.StatusInternalServerError)
				return
			}
		}

		log.Info("workspace created",
			"workspaceID", workspace.ID,
			"workspaceName", workspace.Name,
			"gitEnabled", workspace.GitEnabled,
		)
		respondJSON(w, workspace)
	}
}

// GetWorkspace godoc
// @Summary Get workspace
// @Description Returns the current workspace
// @Tags workspaces
// @ID getWorkspace
// @Security CookieAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Success 200 {object} models.Workspace
// @Failure 500 {object} ErrorResponse "Internal server error"
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
// @Security CookieAuth
// @Accept json
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Param body body models.Workspace true "Workspace"
// @Success 200 {object} models.Workspace
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 500 {object} ErrorResponse "Failed to update workspace"
// @Failure 500 {object} ErrorResponse "Failed to setup git repo"
// @Router /workspaces/{workspace_name} [put]
func (h *Handler) UpdateWorkspace() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getWorkspaceLogger().With(
			"handler", "UpdateWorkspace",
			"userID", ctx.UserID,
			"workspaceID", ctx.Workspace.ID,
			"clientIP", r.RemoteAddr,
		)

		var workspace models.Workspace
		if err := json.NewDecoder(r.Body).Decode(&workspace); err != nil {
			log.Debug("invalid request body received",
				"error", err.Error(),
			)
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Set IDs from the request
		workspace.ID = ctx.Workspace.ID
		workspace.UserID = ctx.UserID

		// Validate the workspace
		if err := workspace.Validate(); err != nil {
			log.Debug("invalid workspace configuration",
				"error", err.Error(),
			)
			respondError(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Track what's changed for logging
		changes := map[string]bool{
			"gitSettings": gitSettingsChanged(&workspace, ctx.Workspace),
			"name":        workspace.Name != ctx.Workspace.Name,
			"theme":       workspace.Theme != ctx.Workspace.Theme,
			"autoSave":    workspace.AutoSave != ctx.Workspace.AutoSave,
		}

		// Handle Git repository setup/teardown if Git settings changed
		if changes["gitSettings"] {
			if workspace.GitEnabled {
				log.Debug("updating git repository configuration",
					"gitURL", workspace.GitURL,
				)

				if err := h.Storage.SetupGitRepo(
					ctx.UserID,
					ctx.Workspace.ID,
					workspace.GitURL,
					workspace.GitUser,
					workspace.GitToken,
					workspace.GitCommitName,
					workspace.GitCommitEmail,
				); err != nil {
					log.Error("failed to setup git repository",
						"error", err.Error(),
					)
					respondError(w, "Failed to setup git repo: "+err.Error(), http.StatusInternalServerError)
					return
				}
			} else {
				log.Debug("disabling git repository")
				h.Storage.DisableGitRepo(ctx.UserID, ctx.Workspace.ID)
			}
		}

		if err := h.DB.UpdateWorkspace(&workspace); err != nil {
			log.Error("failed to update workspace in database",
				"error", err.Error(),
			)
			respondError(w, "Failed to update workspace", http.StatusInternalServerError)
			return
		}

		log.Debug("workspace updated",
			"changes", changes,
		)
		respondJSON(w, workspace)
	}
}

// DeleteWorkspace godoc
// @Summary Delete workspace
// @Description Deletes the current workspace
// @Tags workspaces
// @ID deleteWorkspace
// @Security CookieAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Success 200 {object} DeleteWorkspaceResponse
// @Failure 400 {object} ErrorResponse "Cannot delete the last workspace"
// @Failure 500 {object} ErrorResponse "Failed to get workspaces"
// @Failure 500 {object} ErrorResponse "Failed to start transaction"
// @Failure 500 {object} ErrorResponse "Failed to update last workspace"
// @Failure 500 {object} ErrorResponse "Failed to delete workspace"
// @Failure 500 {object} ErrorResponse "Failed to rollback transaction"
// @Failure 500 {object} ErrorResponse "Failed to commit transaction"
// @Router /workspaces/{workspace_name} [delete]
func (h *Handler) DeleteWorkspace() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getWorkspaceLogger().With(
			"handler", "DeleteWorkspace",
			"userID", ctx.UserID,
			"workspaceID", ctx.Workspace.ID,
			"clientIP", r.RemoteAddr,
		)

		// Check if this is the user's last workspace
		workspaces, err := h.DB.GetWorkspacesByUserID(ctx.UserID)
		if err != nil {
			log.Error("failed to fetch workspaces from database",
				"error", err.Error(),
			)
			respondError(w, "Failed to get workspaces", http.StatusInternalServerError)
			return
		}

		if len(workspaces) <= 1 {
			log.Debug("attempted to delete last workspace")
			respondError(w, "Cannot delete the last workspace", http.StatusBadRequest)
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

		tx, err := h.DB.Begin()
		if err != nil {
			log.Error("failed to start database transaction",
				"error", err.Error(),
			)
			respondError(w, "Failed to start transaction", http.StatusInternalServerError)
			return
		}
		defer func() {
			if err := tx.Rollback(); err != nil && err != sql.ErrTxDone {
				log.Error("failed to rollback transaction",
					"error", err.Error(),
				)
				respondError(w, "Failed to rollback transaction", http.StatusInternalServerError)
			}
		}()

		// Update last workspace ID first
		err = h.DB.UpdateLastWorkspaceTx(tx, ctx.UserID, nextWorkspaceID)
		if err != nil {
			log.Error("failed to update last workspace reference",
				"error", err.Error(),
				"nextWorkspaceID", nextWorkspaceID,
			)
			respondError(w, "Failed to update last workspace", http.StatusInternalServerError)
			return
		}

		// Delete the workspace
		err = h.DB.DeleteWorkspaceTx(tx, ctx.Workspace.ID)
		if err != nil {
			log.Error("failed to delete workspace from database",
				"error", err.Error(),
			)
			respondError(w, "Failed to delete workspace", http.StatusInternalServerError)
			return
		}

		// Commit transaction
		if err = tx.Commit(); err != nil {
			log.Error("failed to commit transaction",
				"error", err.Error(),
			)
			respondError(w, "Failed to commit transaction", http.StatusInternalServerError)
			return
		}

		log.Info("workspace deleted",
			"workspaceName", ctx.Workspace.Name,
			"nextWorkspaceName", nextWorkspaceName,
		)

		// Return the next workspace ID in the response so frontend knows where to redirect
		respondJSON(w, &DeleteWorkspaceResponse{NextWorkspaceName: nextWorkspaceName})
	}
}

// GetLastWorkspaceName godoc
// @Summary Get last workspace name
// @Description Returns the name of the last opened workspace
// @Tags workspaces
// @ID getLastWorkspaceName
// @Security CookieAuth
// @Produce json
// @Success 200 {object} LastWorkspaceNameResponse
// @Failure 500 {object} ErrorResponse "Failed to get last workspace"
// @Router /workspaces/last [get]
func (h *Handler) GetLastWorkspaceName() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getWorkspaceLogger().With(
			"handler", "GetLastWorkspaceName",
			"userID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		workspaceName, err := h.DB.GetLastWorkspaceName(ctx.UserID)
		if err != nil {
			log.Error("failed to fetch last workspace name",
				"error", err.Error(),
			)
			respondError(w, "Failed to get last workspace", http.StatusInternalServerError)
			return
		}

		log.Debug("last workspace name retrieved",
			"workspaceName", workspaceName,
		)
		respondJSON(w, &LastWorkspaceNameResponse{LastWorkspaceName: workspaceName})
	}
}

// UpdateLastWorkspaceName godoc
// @Summary Update last workspace name
// @Description Updates the name of the last opened workspace
// @Tags workspaces
// @ID updateLastWorkspaceName
// @Security CookieAuth
// @Accept json
// @Produce json
// @Success 204 "No Content - Last workspace updated successfully"
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 500 {object} ErrorResponse "Failed to update last workspace"
// @Router /workspaces/last [put]
func (h *Handler) UpdateLastWorkspaceName() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getWorkspaceLogger().With(
			"handler", "UpdateLastWorkspaceName",
			"userID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		var requestBody struct {
			WorkspaceName string `json:"workspaceName"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			log.Debug("invalid request body received",
				"error", err.Error(),
			)
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if err := h.DB.UpdateLastWorkspace(ctx.UserID, requestBody.WorkspaceName); err != nil {
			log.Error("failed to update last workspace",
				"error", err.Error(),
				"workspaceName", requestBody.WorkspaceName,
			)
			respondError(w, "Failed to update last workspace", http.StatusInternalServerError)
			return
		}

		log.Debug("last workspace name updated",
			"workspaceName", requestBody.WorkspaceName,
		)
		w.WriteHeader(http.StatusNoContent)
	}
}
