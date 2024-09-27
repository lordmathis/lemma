package models

type Settings struct {
	UserID   int                    `json:"userId"`
	Settings map[string]interface{} `json:"settings"`
}
