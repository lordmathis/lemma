package secrets

import (
	"os"
	"path/filepath"
	"testing"
)

func TestEnsureJWTSigningKey(t *testing.T) {
	// Create a temporary directory for testing
	tempDir := t.TempDir()
	secretsDir := filepath.Join(tempDir, "secrets")

	t.Run("generates new key if not exists", func(t *testing.T) {
		key, err := EnsureJWTSigningKey(secretsDir)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if key == "" {
			t.Fatal("expected non-empty key")
		}

		// Check that the key file was created
		keyPath := filepath.Join(secretsDir, JWTKeyFile)
		if _, err := os.Stat(keyPath); os.IsNotExist(err) {
			t.Fatal("expected key file to exist")
		}

		// Check file permissions
		info, err := os.Stat(keyPath)
		if err != nil {
			t.Fatalf("failed to stat key file: %v", err)
		}

		perm := info.Mode().Perm()
		if perm != JWTKeyPerm {
			t.Errorf("expected permissions %o, got %o", JWTKeyPerm, perm)
		}
	})

	t.Run("loads existing key", func(t *testing.T) {
		// First call to generate the key
		key1, err := EnsureJWTSigningKey(secretsDir)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		// Second call should load the same key
		key2, err := EnsureJWTSigningKey(secretsDir)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if key1 != key2 {
			t.Error("expected same key on subsequent calls")
		}
	})

	t.Run("fails if key file is empty", func(t *testing.T) {
		emptyDir := filepath.Join(tempDir, "empty_test")
		keyPath := filepath.Join(emptyDir, JWTKeyFile)

		// Create empty key file
		if err := os.MkdirAll(emptyDir, 0700); err != nil {
			t.Fatalf("failed to create directory: %v", err)
		}
		if err := os.WriteFile(keyPath, []byte(""), JWTKeyPerm); err != nil {
			t.Fatalf("failed to write empty file: %v", err)
		}

		_, err := EnsureJWTSigningKey(emptyDir)
		if err == nil {
			t.Error("expected error for empty key file")
		}
	})
}

func TestGenerateJWTSigningKey(t *testing.T) {
	key, err := generateJWTSigningKey()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if key == "" {
		t.Fatal("expected non-empty key")
	}

	// Check that each generated key is unique
	key2, err := generateJWTSigningKey()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if key == key2 {
		t.Error("expected different keys on each generation")
	}
}

