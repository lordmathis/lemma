package db

import (
	"database/sql"
	"encoding/json"

	"novamd/internal/models"
)

func (db *DB) GetSettings(userID int) (models.Settings, error) {
	var settings models.Settings
	var settingsJSON []byte

	err := db.QueryRow("SELECT user_id, settings FROM settings WHERE user_id = ?", userID).Scan(&settings.UserID, &settingsJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			// If no settings found, return default settings
			settings.UserID = userID
			settings.Settings = models.UserSettings{} // This will be filled with defaults later
			return settings, nil
		}
		return settings, err
	}

	err = json.Unmarshal(settingsJSON, &settings.Settings)
	if err != nil {
		return settings, err
	}

	return settings, nil
}

func (db *DB) SaveSettings(settings models.Settings) error {
	if err := settings.Validate(); err != nil {
		return err
	}

	settingsJSON, err := json.Marshal(settings.Settings)
	if err != nil {
		return err
	}

	_, err = db.Exec("INSERT OR REPLACE INTO settings (user_id, settings) VALUES (?, json(?))", settings.UserID, string(settingsJSON))
	return err
}
