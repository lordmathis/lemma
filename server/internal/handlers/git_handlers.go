package handlers

import (
	"encoding/json"
	"net/http"

	"novamd/internal/context"
)

// StageCommitAndPush godoc
// @Summary Stage, commit, and push changes
// @Description Stages, commits, and pushes changes to the remote repository
// @Tags git
// @ID stageCommitAndPush
// @Security BearerAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Param body body string true "Commit message"
// @Success 200 {object} map[string]string
// @Failure 400 {string} string "Invalid request body"
// @Failure 400 {string} string "Commit message is required"
// @Failure 500 {string} string "Failed to stage, commit, and push changes"
// @Router /workspaces/{workspace_name}/git/commit [post]
func (h *Handler) StageCommitAndPush() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
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

		err := h.Storage.StageCommitAndPush(ctx.UserID, ctx.Workspace.ID, requestBody.Message)
		if err != nil {
			http.Error(w, "Failed to stage, commit, and push changes: "+err.Error(), http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "Changes staged, committed, and pushed successfully"})
	}
}

// PullChanges godoc
// @Summary Pull changes from remote
// @Description Pulls changes from the remote repository
// @Tags git
// @ID pullChanges
// @Security BearerAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Success 200 {object} map[string]string
// @Failure 500 {string} string "Failed to pull changes"
// @Router /workspaces/{workspace_name}/git/pull [post]
func (h *Handler) PullChanges() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		err := h.Storage.Pull(ctx.UserID, ctx.Workspace.ID)
		if err != nil {
			http.Error(w, "Failed to pull changes: "+err.Error(), http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "Pulled changes from remote"})
	}
}
