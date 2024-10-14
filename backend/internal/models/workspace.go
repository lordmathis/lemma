package models

import (
	"time"
)

type Workspace struct {
	ID        int       `json:"id" validate:"required,min=1"`
	UserID    int       `json:"userId" validate:"required,min=1"`
	Name      string    `json:"name" validate:"required"`
	CreatedAt time.Time `json:"createdAt"`
}

func (w *Workspace) Validate() error {
	return validate.Struct(w)
}
