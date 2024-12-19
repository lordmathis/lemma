package secrets_test

import (
	"encoding/base64"
	"strings"
	"testing"

	"novamd/internal/secrets"
	_ "novamd/internal/testenv"
)

func TestValidateKey(t *testing.T) {
	testCases := []struct {
		name        string
		key         string
		wantErr     bool
		errContains string
	}{
		{
			name:    "valid 32-byte base64 key",
			key:     base64.StdEncoding.EncodeToString(make([]byte, 32)),
			wantErr: false,
		},
		{
			name:        "empty key",
			key:         "",
			wantErr:     true,
			errContains: "encryption key is required",
		},
		{
			name:        "invalid base64",
			key:         "not-base64!@#$",
			wantErr:     true,
			errContains: "invalid base64 encoding",
		},
		{
			name:        "wrong key size (16 bytes)",
			key:         base64.StdEncoding.EncodeToString(make([]byte, 16)),
			wantErr:     true,
			errContains: "encryption key must be 32 bytes",
		},
		{
			name:        "wrong key size (64 bytes)",
			key:         base64.StdEncoding.EncodeToString(make([]byte, 64)),
			wantErr:     true,
			errContains: "encryption key must be 32 bytes",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := secrets.ValidateKey(tc.key)

			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
					return
				}
				if !strings.Contains(err.Error(), tc.errContains) {
					t.Errorf("error = %v, want error containing %q", err, tc.errContains)
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestNew(t *testing.T) {
	testCases := []struct {
		name        string
		key         string
		wantErr     bool
		errContains string
	}{
		{
			name:    "valid key",
			key:     base64.StdEncoding.EncodeToString(make([]byte, 32)),
			wantErr: false,
		},
		{
			name:        "empty key",
			key:         "",
			wantErr:     true,
			errContains: "encryption key is required",
		},
		{
			name:        "invalid key",
			key:         "invalid",
			wantErr:     true,
			errContains: "invalid base64 encoding",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			e, err := secrets.NewService(tc.key)

			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
					return
				}
				if !strings.Contains(err.Error(), tc.errContains) {
					t.Errorf("error = %v, want error containing %q", err, tc.errContains)
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if e == nil {
				t.Error("expected Encryptor instance, got nil")
			}
		})
	}
}

func TestEncryptDecrypt(t *testing.T) {
	// Generate a valid key for testing
	key := base64.StdEncoding.EncodeToString(make([]byte, 32))
	e, err := secrets.NewService(key)
	if err != nil {
		t.Fatalf("failed to create Encryptor instance: %v", err)
	}

	testCases := []struct {
		name      string
		plaintext string
		wantErr   bool
	}{
		{
			name:      "normal text",
			plaintext: "Hello, World!",
			wantErr:   false,
		},
		{
			name:      "empty string",
			plaintext: "",
			wantErr:   false,
		},
		{
			name:      "long text",
			plaintext: strings.Repeat("Long text with lots of content. ", 100),
			wantErr:   false,
		},
		{
			name:      "special characters",
			plaintext: "!@#$%^&*()_+-=[]{}|;:,.<>?",
			wantErr:   false,
		},
		{
			name:      "unicode characters",
			plaintext: "Hello, 世界! नमस्ते",
			wantErr:   false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Test encryption
			ciphertext, err := e.Encrypt(tc.plaintext)
			if tc.wantErr {
				if err == nil {
					t.Error("expected encryption error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected encryption error: %v", err)
			}

			// Verify ciphertext is different from plaintext
			if tc.plaintext != "" && ciphertext == tc.plaintext {
				t.Error("ciphertext matches plaintext")
			}

			// Test decryption
			decrypted, err := e.Decrypt(ciphertext)
			if err != nil {
				t.Fatalf("unexpected decryption error: %v", err)
			}

			// Verify decrypted text matches original
			if decrypted != tc.plaintext {
				t.Errorf("decrypted text = %q, want %q", decrypted, tc.plaintext)
			}
		})
	}
}

func TestDecryptInvalidCiphertext(t *testing.T) {
	key := base64.StdEncoding.EncodeToString(make([]byte, 32))
	e, err := secrets.NewService(key)
	if err != nil {
		t.Fatalf("failed to create Encryptor instance: %v", err)
	}

	testCases := []struct {
		name        string
		ciphertext  string
		wantErr     bool
		errContains string
	}{
		{
			name:       "empty ciphertext",
			ciphertext: "",
			wantErr:    false,
		},
		{
			name:        "invalid base64",
			ciphertext:  "not-base64!@#$",
			wantErr:     true,
			errContains: "invalid base64 encoding",
		},
		{
			name:        "invalid ciphertext (too short)",
			ciphertext:  base64.StdEncoding.EncodeToString(make([]byte, 10)),
			wantErr:     true,
			errContains: "invalid ciphertext: too short",
		},
		{
			name:        "tampered ciphertext",
			ciphertext:  base64.StdEncoding.EncodeToString(make([]byte, 50)),
			wantErr:     true,
			errContains: "message authentication failed",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			decrypted, err := e.Decrypt(tc.ciphertext)

			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
					return
				}
				if !strings.Contains(err.Error(), tc.errContains) {
					t.Errorf("error = %v, want error containing %q", err, tc.errContains)
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}

			if decrypted != "" {
				t.Errorf("expected empty string, got %q", decrypted)
			}
		})
	}
}
