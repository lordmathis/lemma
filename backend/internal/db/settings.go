package db

import (
	"database/sql"
	"encoding/json"

	"novamd/internal/models"
)

func (db *DB) GetWorkspaceSettings(workspaceID int) (*models.WorkspaceSettings, error) {
	var settings models.WorkspaceSettings
	var settingsJSON []byte

	err := db.QueryRow("SELECT workspace_id, settings FROM workspace_settings WHERE workspace_id = ?", workspaceID).
		Scan(&settings.WorkspaceID, &settingsJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			// If no settings found, return default settings
			settings.WorkspaceID = workspaceID
			settings.Settings = models.UserSettings{} // This will be filled with defaults later
			return &settings, nil
		}
		return nil, err
	}

	err = json.Unmarshal(settingsJSON, &settings.Settings)
	if err != nil {
		return nil, err
	}

	return &settings, nil
}

func (db *DB) SaveWorkspaceSettings(settings *models.WorkspaceSettings) error {
	settingsJSON, err := json.Marshal(settings.Settings)
	if err != nil {
		return err
	}

	_, err = db.Exec("INSERT OR REPLACE INTO workspace_settings (workspace_id, settings) VALUES (?, ?)",
		settings.WorkspaceID, settingsJSON)
	return err
}