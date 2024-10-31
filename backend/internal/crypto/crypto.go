package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
)

var (
	ErrKeyRequired    = errors.New("encryption key is required")
	ErrInvalidKeySize = errors.New("encryption key must be 32 bytes (256 bits) when decoded")
)

type Crypto struct {
	key []byte
}

// ValidateKey checks if the provided key is suitable for AES-256
func ValidateKey(key string) error {
	if key == "" {
		return ErrKeyRequired
	}

	// Attempt to decode base64
	keyBytes, err := base64.StdEncoding.DecodeString(key)
	if err != nil {
		return fmt.Errorf("invalid base64 encoding: %w", err)
	}

	if len(keyBytes) != 32 {
		return fmt.Errorf("%w: got %d bytes", ErrInvalidKeySize, len(keyBytes))
	}

	// Verify the key can be used for AES
	_, err = aes.NewCipher(keyBytes)
	if err != nil {
		return fmt.Errorf("invalid encryption key: %w", err)
	}

	return nil
}

// New creates a new Crypto instance with the provided base64-encoded key
func New(key string) (*Crypto, error) {
	if err := ValidateKey(key); err != nil {
		return nil, err
	}

	keyBytes, _ := base64.StdEncoding.DecodeString(key)
	return &Crypto{key: keyBytes}, nil
}

// Encrypt encrypts the plaintext using AES-256-GCM
func (c *Crypto) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	block, err := aes.NewCipher(c.key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts the ciphertext using AES-256-GCM
func (c *Crypto) Decrypt(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(c.key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
