package db

import (
	"database/sql"
	"fmt"

	"novamd/internal/crypto"

	_ "github.com/mattn/go-sqlite3"
)

type DB struct {
	*sql.DB
	crypto *crypto.Crypto
}

func Init(dbPath string, encryptionKey string) (*DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Initialize crypto service
	cryptoService, err := crypto.New(encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize encryption: %w", err)
	}

	database := &DB{
		DB:     db,
		crypto: cryptoService,
	}

	if err := database.Migrate(); err != nil {
		return nil, err
	}

	return database, nil
}

func (db *DB) Close() error {
	return db.DB.Close()
}

// Helper methods for token encryption/decryption
func (db *DB) encryptToken(token string) (string, error) {
	if token == "" {
		return "", nil
	}
	return db.crypto.Encrypt(token)
}

func (db *DB) decryptToken(token string) (string, error) {
	if token == "" {
		return "", nil
	}
	return db.crypto.Decrypt(token)
}
