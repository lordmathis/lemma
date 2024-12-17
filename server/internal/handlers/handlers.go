package handlers

import (
	"encoding/json"
	"net/http"
	"novamd/internal/db"
	"novamd/internal/logging"
	"novamd/internal/storage"
)

// ErrorResponse is a generic error response
type ErrorResponse struct {
	Message string `json:"message"`
}

// Handler provides common functionality for all handlers
type Handler struct {
	DB      db.Database
	Storage storage.Manager
}

var logger logging.Logger

func getHandlersLogger() logging.Logger {
	if logger == nil {
		logger = logging.WithGroup("handlers")
	}
	return logger
}

// NewHandler creates a new handler with the given dependencies
func NewHandler(db db.Database, s storage.Manager) *Handler {
	return &Handler{
		DB:      db,
		Storage: s,
	}
}

// respondJSON is a helper to send JSON responses
func respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		respondError(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// respondError is a helper to send error responses
func respondError(w http.ResponseWriter, message string, code int) {
	w.WriteHeader(code)
	respondJSON(w, ErrorResponse{Message: message})
}
