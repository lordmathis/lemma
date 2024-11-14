package handlers

import (
	"encoding/json"
	"net/http"

	"novamd/internal/httpcontext"
)

func (h *Handler) StageCommitAndPush() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := httpcontext.GetRequestContext(w, r)
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

func (h *Handler) PullChanges() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := httpcontext.GetRequestContext(w, r)
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
