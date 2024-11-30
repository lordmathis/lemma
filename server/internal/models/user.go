package models

import (
	"time"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// UserRole represents the role of a user in the system
type UserRole string

// User roles
const (
	RoleAdmin  UserRole = "admin"
	RoleEditor UserRole = "editor"
	RoleViewer UserRole = "viewer"
)

// User represents a user in the system
type User struct {
	ID              int       `json:"id" validate:"required,min=1"`
	Email           string    `json:"email" validate:"required,email"`
	DisplayName     string    `json:"displayName"`
	PasswordHash    string    `json:"-"`
	Role            UserRole  `json:"role" validate:"required,oneof=admin editor viewer"`
	CreatedAt       time.Time `json:"createdAt"`
	LastWorkspaceID int       `json:"lastWorkspaceId"`
}

// Validate validates the user struct
func (u *User) Validate() error {
	return validate.Struct(u)
}
