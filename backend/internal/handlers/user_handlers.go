package handlers

import (
	"net/http"

	"novamd/internal/httpcontext"
)

func (h *Handler) GetUser() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := httpcontext.GetRequestContext(w, r)
		if !ok {
			return
		}

		user, err := h.DB.GetUserByID(ctx.UserID)
		if err != nil {
			http.Error(w, "Failed to get user", http.StatusInternalServerError)
			return
		}

		respondJSON(w, user)
	}
}
