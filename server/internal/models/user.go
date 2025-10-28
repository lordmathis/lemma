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
	ID              int       `json:"id" db:"id,default" validate:"required,min=1"`
	Email           string    `json:"email" db:"email" validate:"required,email"`
	DisplayName     string    `json:"displayName" db:"display_name"`
	PasswordHash    string    `json:"-" db:"password_hash"`
	Role            UserRole  `json:"role" db:"role" validate:"required,oneof=admin editor viewer"`
	Theme           string    `json:"theme" db:"theme" validate:"required,oneof=light dark"`
	CreatedAt       time.Time `json:"createdAt" db:"created_at,default"`
	LastWorkspaceID int       `json:"lastWorkspaceId" db:"last_workspace_id"`
}

// Validate validates the user struct
func (u *User) Validate() error {
	return validate.Struct(u)
}
