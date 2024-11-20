package storage_test

import (
	"errors"
	"path/filepath"
	"strings"
	"testing"

	"novamd/internal/storage"
)

func TestValidatePath(t *testing.T) {
	mockFS := NewMockFS()
	s := storage.NewServiceWithOptions("test-root", storage.Options{
		Fs:           mockFS,
		NewGitClient: nil,
	})

	testCases := []struct {
		name        string
		userID      int
		workspaceID int
		path        string
		want        string
		wantErr     bool
		errContains string
	}{
		{
			name:        "valid path",
			userID:      1,
			workspaceID: 1,
			path:        "notes/test.md",
			want:        filepath.Join("test-root", "1", "1", "notes", "test.md"),
			wantErr:     false,
		},
		{
			name:        "valid path with dot",
			userID:      1,
			workspaceID: 1,
			path:        "./notes/test.md",
			want:        filepath.Join("test-root", "1", "1", "notes", "test.md"),
			wantErr:     false,
		},
		{
			name:        "path with parent directory traversal",
			userID:      1,
			workspaceID: 1,
			path:        "../../../etc/passwd",
			want:        "",
			wantErr:     true,
			errContains: "outside of workspace",
		},
		{
			name:        "absolute path attempt",
			userID:      1,
			workspaceID: 1,
			path:        "/etc/passwd",
			want:        "",
			wantErr:     true,
			errContains: "absolute paths not allowed",
		},
		{
			name:        "empty path",
			userID:      1,
			workspaceID: 1,
			path:        "",
			want:        filepath.Join("test-root", "1", "1"),
			wantErr:     false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := s.ValidatePath(tc.userID, tc.workspaceID, tc.path)

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
				t.Fatalf("unexpected error: %v", err)
			}

			if got != tc.want {
				t.Errorf("ValidatePath() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestGetWorkspacePath(t *testing.T) {
	mockFS := NewMockFS()
	s := storage.NewServiceWithOptions("test-root", storage.Options{
		Fs:           mockFS,
		NewGitClient: nil,
	})

	testCases := []struct {
		name        string
		userID      int
		workspaceID int
		want        string
	}{
		{
			name:        "standard workspace path",
			userID:      1,
			workspaceID: 1,
			want:        filepath.Join("test-root", "1", "1"),
		},
		{
			name:        "different user and workspace IDs",
			userID:      2,
			workspaceID: 3,
			want:        filepath.Join("test-root", "2", "3"),
		},
		{
			name:        "zero IDs",
			userID:      0,
			workspaceID: 0,
			want:        filepath.Join("test-root", "0", "0"),
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			got := s.GetWorkspacePath(tc.userID, tc.workspaceID)
			if got != tc.want {
				t.Errorf("GetWorkspacePath() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestInitializeUserWorkspace(t *testing.T) {
	mockFS := NewMockFS()
	s := storage.NewServiceWithOptions("test-root", storage.Options{
		Fs:           mockFS,
		NewGitClient: nil,
	})

	testCases := []struct {
		name        string
		userID      int
		workspaceID int
		mockErr     error
		wantErr     bool
		errContains string
	}{
		{
			name:        "successful initialization",
			userID:      1,
			workspaceID: 1,
			mockErr:     nil,
			wantErr:     false,
		},
		{
			name:        "mkdir error",
			userID:      1,
			workspaceID: 1,
			mockErr:     errors.New("permission denied"),
			wantErr:     true,
			errContains: "failed to create workspace directory",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockFS.MkdirError = tc.mockErr
			err := s.InitializeUserWorkspace(tc.userID, tc.workspaceID)

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
				t.Fatalf("unexpected error: %v", err)
			}

			// Verify the correct directory was created
			expectedPath := filepath.Join("test-root", "1", "1")
			dirCreated := false
			for _, path := range mockFS.MkdirCalls {
				if path == expectedPath {
					dirCreated = true
					break
				}
			}
			if !dirCreated {
				t.Errorf("directory %s was not created", expectedPath)
			}
		})
	}
}

func TestDeleteUserWorkspace(t *testing.T) {
	mockFS := NewMockFS()
	s := storage.NewServiceWithOptions("test-root", storage.Options{
		Fs:           mockFS,
		NewGitClient: nil,
	})

	testCases := []struct {
		name        string
		userID      int
		workspaceID int
		mockErr     error
		wantErr     bool
		errContains string
	}{
		{
			name:        "successful deletion",
			userID:      1,
			workspaceID: 1,
			mockErr:     nil,
			wantErr:     false,
		},
		{
			name:        "removal error",
			userID:      1,
			workspaceID: 1,
			mockErr:     errors.New("permission denied"),
			wantErr:     true,
			errContains: "failed to delete workspace directory",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockFS.RemoveError = tc.mockErr
			err := s.DeleteUserWorkspace(tc.userID, tc.workspaceID)

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
				t.Fatalf("unexpected error: %v", err)
			}

			// Verify the correct directory was deleted
			expectedPath := filepath.Join("test-root", "1", "1")
			dirDeleted := false
			for _, path := range mockFS.RemoveCalls {
				if path == expectedPath {
					dirDeleted = true
					break
				}
			}
			if !dirDeleted {
				t.Errorf("directory %s was not deleted", expectedPath)
			}
		})
	}
}
