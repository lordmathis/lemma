package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

func getWorkspaceID(r *http.Request) (int, error) {
	workspaceIDStr := chi.URLParam(r, "workspaceId")
	workspaceID, err := strconv.Atoi(workspaceIDStr)
	if err != nil {
		return 0, errors.New("invalid workspaceId")
	}

	return workspaceID, nil
}

func respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}
