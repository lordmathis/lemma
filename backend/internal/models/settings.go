package models

import (
	"encoding/json"

	"github.com/go-playground/validator/v10"
)

type UserSettings struct {
	Theme                string `json:"theme" validate:"oneof=light dark"`
	AutoSave             bool   `json:"autoSave"`
	GitEnabled           bool   `json:"gitEnabled"`
	GitURL               string `json:"gitUrl" validate:"required_with=GitEnabled"`
	GitUser              string `json:"gitUser" validate:"required_with=GitEnabled"`
	GitToken             string `json:"gitToken" validate:"required_with=GitEnabled"`
	GitAutoCommit        bool   `json:"gitAutoCommit"`
	GitCommitMsgTemplate string `json:"gitCommitMsgTemplate"`
}

type WorkspaceSettings struct {
	WorkspaceID int          `json:"workspaceId" validate:"required,min=1"`
	Settings    UserSettings `json:"settings" validate:"required"`
}

var validate = validator.New()

func (s *UserSettings) Validate() error {
	return validate.Struct(s)
}

func (ws *WorkspaceSettings) Validate() error {
	return validate.Struct(ws)
}

func (ws *WorkspaceSettings) UnmarshalJSON(data []byte) error {
	type Alias WorkspaceSettings
	aux := &struct {
		*Alias
	}{
		Alias: (*Alias)(ws),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	return ws.Validate()
}