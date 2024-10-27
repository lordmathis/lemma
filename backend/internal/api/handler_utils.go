package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

func getUserID(r *http.Request) (int, error) {
	userIDStr := chi.URLParam(r, "userId")
	return strconv.Atoi(userIDStr)
}

func getUserAndWorkspaceIDs(r *http.Request) (int, int, error) {
	userID, err := getUserID(r)
	if err != nil {
		return 0, 0, errors.New("invalid userId")
	}

	workspaceIDStr := chi.URLParam(r, "workspaceId")
	workspaceID, err := strconv.Atoi(workspaceIDStr)
	if err != nil {
		return userID, 0, errors.New("invalid workspaceId")
	}

	return userID, workspaceID, nil
}

func respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}
