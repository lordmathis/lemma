package models

import (
	"encoding/json"

	"github.com/go-playground/validator/v10"
)

type UserSettings struct {
	Theme                string `json:"theme" validate:"oneof=light dark"`
	AutoSave             bool   `json:"autoSave"`
	GitEnabled           bool   `json:"git_enabled"`
	GitURL               string `json:"git_url" validate:"required_with=GitEnabled"`
	GitUser              string `json:"git_user" validate:"required_with=GitEnabled"`
	GitToken             string `json:"git_token" validate:"required_with=GitEnabled"`
	GitAutoCommit        bool   `json:"git_auto_commit"`
	GitCommitMsgTemplate string `json:"git_commit_msg_template"`
}

type Settings struct {
	UserID   int          `json:"userId" validate:"required,min=1"`
	Settings UserSettings `json:"settings" validate:"required"`
}

var defaultUserSettings = UserSettings{
	Theme:                "light",
	AutoSave:             false,
	GitEnabled:           false,
	GitCommitMsgTemplate: "Update ${filename}",
}

var validate = validator.New()

func (s *Settings) Validate() error {
	return validate.Struct(s)
}

func (s *Settings) SetDefaults() {
	if s.Settings.Theme == "" {
		s.Settings.Theme = defaultUserSettings.Theme
	}
	if s.Settings.GitCommitMsgTemplate == "" {
		s.Settings.GitCommitMsgTemplate = defaultUserSettings.GitCommitMsgTemplate
	}
}

func (s *Settings) UnmarshalJSON(data []byte) error {
	type Alias Settings
	aux := &struct {
		*Alias
	}{
		Alias: (*Alias)(s),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	return s.Validate()
}
