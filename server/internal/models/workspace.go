package models

import (
	"time"
)

// Workspace represents a user's workspace in the system
type Workspace struct {
	ID                 int       `json:"id" db:"id,default" validate:"required,min=1"`
	UserID             int       `json:"userId" db:"user_id" validate:"required,min=1"`
	Name               string    `json:"name" db:"name" validate:"required"`
	CreatedAt          time.Time `json:"createdAt" db:"created_at,default"`
	LastOpenedFilePath string    `json:"lastOpenedFilePath" db:"last_opened_file_path"`

	// Integrated settings
	Theme                string `json:"theme" db:"theme" validate:"required,oneof=light dark"`
	AutoSave             bool   `json:"autoSave" db:"auto_save"`
	ShowHiddenFiles      bool   `json:"showHiddenFiles" db:"show_hidden_files"`
	GitEnabled           bool   `json:"gitEnabled" db:"git_enabled"`
	GitURL               string `json:"gitUrl" db:"git_url,ommitempty" validate:"required_if=GitEnabled true"`
	GitUser              string `json:"gitUser" db:"git_user,ommitempty" validate:"required_if=GitEnabled true"`
	GitToken             string `json:"gitToken" db:"git_token,ommitempty,encrypted" validate:"required_if=GitEnabled true"`
	GitAutoCommit        bool   `json:"gitAutoCommit" db:"git_auto_commit"`
	GitCommitMsgTemplate string `json:"gitCommitMsgTemplate" db:"git_commit_msg_template"`
	GitCommitName        string `json:"gitCommitName" db:"git_commit_name"`
	GitCommitEmail       string `json:"gitCommitEmail" db:"git_commit_email" validate:"omitempty,required_if=GitEnabled true,email"`
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
		w.Theme = "dark"
	}

	w.AutoSave = w.AutoSave || false
	w.ShowHiddenFiles = w.ShowHiddenFiles || false
	w.GitEnabled = w.GitEnabled || false

	w.GitAutoCommit = w.GitEnabled && (w.GitAutoCommit || false)

	if w.GitCommitMsgTemplate == "" {
		w.GitCommitMsgTemplate = "${action} ${filename}"
	}
}
