package models

import (
	"time"
)

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
}

func (w *Workspace) Validate() error {
	return validate.Struct(w)
}

func (w *Workspace) GetDefaultSettings() {
	w.Theme = "light"
	w.AutoSave = false
	w.ShowHiddenFiles = false
	w.GitEnabled = false
	w.GitURL = ""
	w.GitUser = ""
	w.GitToken = ""
	w.GitAutoCommit = false
	w.GitCommitMsgTemplate = "${action} ${filename}"
}
