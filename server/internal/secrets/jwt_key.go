package secrets

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
)

const (
	// JWTKeyBytes is the size of the JWT signing key in bytes (256 bits)
	JWTKeyBytes = 32
	// JWTKeyFile is the filename for the JWT signing key
	JWTKeyFile = "jwt_signing_key"
	// JWTKeyPerm is the file permission for the JWT signing key (owner read/write only)
	JWTKeyPerm = 0600
)

// EnsureJWTSigningKey ensures a JWT signing key exists in the secrets directory.
// If no key exists, it generates and stores a new one with restrictive permissions.
// Returns the base64-encoded signing key.
func EnsureJWTSigningKey(secretsDir string) (string, error) {
	log := getLogger()

	// Ensure the secrets directory exists with restrictive permissions
	if err := os.MkdirAll(secretsDir, 0700); err != nil {
		return "", fmt.Errorf("failed to create secrets directory: %w", err)
	}

	keyPath := filepath.Join(secretsDir, JWTKeyFile)

	// Check if the key file already exists
	if _, err := os.Stat(keyPath); err == nil {
		// Key file exists, read it
		keyBytes, err := os.ReadFile(keyPath)
		if err != nil {
			return "", fmt.Errorf("failed to read JWT signing key: %w", err)
		}

		key := string(keyBytes)
		if key == "" {
			return "", fmt.Errorf("JWT signing key file is empty")
		}

		log.Debug("loaded existing JWT signing key from file")
		return key, nil
	}

	// Key file doesn't exist, generate a new key
	log.Info("generating new JWT signing key")
	key, err := generateJWTSigningKey()
	if err != nil {
		return "", fmt.Errorf("failed to generate JWT signing key: %w", err)
	}

	// Write the key to the file with restrictive permissions
	if err := os.WriteFile(keyPath, []byte(key), JWTKeyPerm); err != nil {
		return "", fmt.Errorf("failed to write JWT signing key: %w", err)
	}

	// Double-check permissions (some systems might ignore mode in WriteFile)
	if err := os.Chmod(keyPath, JWTKeyPerm); err != nil {
		return "", fmt.Errorf("failed to set JWT signing key permissions: %w", err)
	}

	log.Info("JWT signing key generated and stored", "path", keyPath)
	return key, nil
}

// generateJWTSigningKey generates a cryptographically secure random signing key
func generateJWTSigningKey() (string, error) {
	keyBytes := make([]byte, JWTKeyBytes)
	if _, err := rand.Read(keyBytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	// Encode to base64 for easy storage and handling
	key := base64.StdEncoding.EncodeToString(keyBytes)
	return key, nil
}

