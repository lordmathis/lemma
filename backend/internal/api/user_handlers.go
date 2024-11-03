package api

import (
	"net/http"

	"novamd/internal/db"
)

func (h *BaseHandler) GetUser(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		user, err := db.GetUserByID(ctx.UserID)
		if err != nil {
			http.Error(w, "Failed to get user", http.StatusInternalServerError)
			return
		}

		respondJSON(w, user)
	}
}
