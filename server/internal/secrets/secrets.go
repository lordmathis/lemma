// Package secrets provides an Encryptor interface for encrypting and decrypting strings using AES-256-GCM.
package secrets

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
)

// Encryptor is an interface for encrypting and decrypting strings
type Encryptor interface {
	Encrypt(plaintext string) (string, error)
	Decrypt(ciphertext string) (string, error)
}

type encryptor struct {
	gcm cipher.AEAD
}

// ValidateKey checks if the provided base64-encoded key is suitable for AES-256
func ValidateKey(key string) error {
	_, err := decodeAndValidateKey(key)
	return err
}

// decodeAndValidateKey validates and decodes the base64-encoded key
// Returns the decoded key bytes if valid
func decodeAndValidateKey(key string) ([]byte, error) {
	if key == "" {
		return nil, fmt.Errorf("encryption key is required")
	}

	keyBytes, err := base64.StdEncoding.DecodeString(key)
	if err != nil {
		return nil, fmt.Errorf("invalid base64 encoding: %w", err)
	}

	if len(keyBytes) != 32 {
		return nil, fmt.Errorf("encryption key must be 32 bytes (256 bits): got %d bytes", len(keyBytes))
	}

	// Verify the key can be used for AES
	_, err = aes.NewCipher(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("invalid encryption key: %w", err)
	}

	return keyBytes, nil
}

// New creates a new Crypto instance with the provided base64-encoded key
func New(key string) (Encryptor, error) {
	keyBytes, err := decodeAndValidateKey(key)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	return &encryptor{gcm: gcm}, nil
}

// Encrypt encrypts the plaintext using AES-256-GCM
func (e *encryptor) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	nonce := make([]byte, e.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := e.gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts the ciphertext using AES-256-GCM
func (e *encryptor) Decrypt(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("invalid base64 encoding: %w", err)
	}

	nonceSize := e.gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("invalid ciphertext: too short")
	}

	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := e.gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
