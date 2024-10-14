package models

import (
	"time"
)

type User struct {
	ID           int       `json:"id" validate:"required,min=1"`
	Username     string    `json:"username" validate:"required"`
	Email        string    `json:"email" validate:"required,email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
}

func (u *User) Validate() error {
	return validate.Struct(u)
}