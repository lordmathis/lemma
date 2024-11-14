package handlers

import (
	"encoding/json"
	"net/http"
	"novamd/internal/db"
	"novamd/internal/storage"
)

// Handler provides common functionality for all handlers
type Handler struct {
	DB      *db.DB
	Storage storage.Manager
}

// NewHandler creates a new handler with the given dependencies
func NewHandler(db *db.DB, s storage.Manager) *Handler {
	return &Handler{
		DB:      db,
		Storage: s,
	}
}

// respondJSON is a helper to send JSON responses
func respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}
