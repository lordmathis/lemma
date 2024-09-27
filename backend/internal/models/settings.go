package models

import (
	"encoding/json"

	"github.com/go-playground/validator/v10"
)

type UserSettings struct {
	Theme    string `json:"theme" validate:"oneof=light dark"`
	AutoSave bool   `json:"autoSave"`
}

type Settings struct {
	UserID   int          `json:"userId" validate:"required,min=1"`
	Settings UserSettings `json:"settings" validate:"required,dive"`
}

var validate = validator.New()

func (s *Settings) Validate() error {
	return validate.Struct(s)
}

func (s *Settings) SetDefaults(defaults UserSettings) {
	if s.Settings.Theme == "" {
		s.Settings.Theme = defaults.Theme
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
