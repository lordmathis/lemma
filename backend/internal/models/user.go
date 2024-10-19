package models

import (
	"time"
)

type UserRole string

const (
	RoleAdmin  UserRole = "admin"
	RoleEditor UserRole = "editor"
	RoleViewer UserRole = "viewer"
)

type User struct {
	ID                 int       `json:"id" validate:"required,min=1"`
	Email              string    `json:"email" validate:"required,email"`
	DisplayName        string    `json:"displayName"`
	PasswordHash       string    `json:"-"`
	Role               UserRole  `json:"role" validate:"required,oneof=admin editor viewer"`
	CreatedAt          time.Time `json:"createdAt"`
	LastWorkspaceID    int       `json:"lastWorkspaceId"`
	LastOpenedFilePath string    `json:"lastOpenedFilePath"`
}

func (u *User) Validate() error {
	return validate.Struct(u)
}
