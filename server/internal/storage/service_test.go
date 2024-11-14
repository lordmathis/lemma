package storage_test

import (
	"novamd/internal/storage"
	"testing"
)

func SetupTestService(t *testing.T) (*storage.Service, *MapFS) {
	fs := &MapFS{}
	srv := storage.NewServiceWithFS("/test/root", fs)
	return srv, fs
}
