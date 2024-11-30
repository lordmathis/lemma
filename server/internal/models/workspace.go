package models

import (
	"time"
)

// Workspace represents a user's workspace in the system
type Workspace struct {
	ID                 int       `json:"id" validate:"required,min=1"`
	UserID             int       `json:"userId" validate:"required,min=1"`
	Name               string    `json:"name" validate:"required"`
	CreatedAt          time.Time `json:"createdAt"`
	LastOpenedFilePath string    `json:"lastOpenedFilePath"`

	// Integrated settings
	Theme                string `json:"theme" validate:"oneof=light dark"`
	AutoSave             bool   `json:"autoSave"`
	ShowHiddenFiles      bool   `json:"showHiddenFiles"`
	GitEnabled           bool   `json:"gitEnabled"`
	GitURL               string `json:"gitUrl" validate:"required_if=GitEnabled true"`
	GitUser              string `json:"gitUser" validate:"required_if=GitEnabled true"`
	GitToken             string `json:"gitToken" validate:"required_if=GitEnabled true"`
	GitAutoCommit        bool   `json:"gitAutoCommit"`
	GitCommitMsgTemplate string `json:"gitCommitMsgTemplate"`
	GitCommitName        string `json:"gitCommitName"`
	GitCommitEmail       string `json:"gitCommitEmail" validate:"required_if=GitEnabled true,email"`
}

// Validate validates the workspace struct
func (w *Workspace) Validate() error {
	return validate.Struct(w)
}

// ValidateGitSettings validates the git settings if git is enabled
func (w *Workspace) ValidateGitSettings() error {
	return validate.StructExcept(w, "ID", "UserID", "Theme")
}

// SetDefaultSettings sets the default settings for the workspace
func (w *Workspace) SetDefaultSettings() {

	if w.Theme == "" {
		w.Theme = "light"
	}

	w.AutoSave = w.AutoSave || false
	w.ShowHiddenFiles = w.ShowHiddenFiles || false
	w.GitEnabled = w.GitEnabled || false

	w.GitAutoCommit = w.GitEnabled && (w.GitAutoCommit || false)

	if w.GitCommitMsgTemplate == "" {
		w.GitCommitMsgTemplate = "${action} ${filename}"
	}
}
