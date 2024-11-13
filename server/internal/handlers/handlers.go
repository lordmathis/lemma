package handlers

import (
	"encoding/json"
	"net/http"
	"novamd/internal/db"
	"novamd/internal/filesystem"
)

// Handler provides common functionality for all handlers
type Handler struct {
	DB *db.DB
	S  *filesystem.Storage
}

// NewHandler creates a new handler with the given dependencies
func NewHandler(db *db.DB, fs *filesystem.Storage) *Handler {
	return &Handler{
		DB: db,
		S:  fs,
	}
}

// respondJSON is a helper to send JSON responses
func respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}
