package storage_test

import (
	"errors"
	"testing"

	"novamd/internal/git"
	"novamd/internal/storage"
	_ "novamd/internal/testenv"
)

// MockGitClient implements git.Client interface for testing
type MockGitClient struct {
	CloneCalled   bool
	PullCalled    bool
	CommitCalled  bool
	PushCalled    bool
	EnsureCalled  bool
	CommitMessage string
	ReturnError   error
}

func (m *MockGitClient) Clone() error {
	m.CloneCalled = true
	return m.ReturnError
}

func (m *MockGitClient) Pull() error {
	m.PullCalled = true
	return m.ReturnError
}

func (m *MockGitClient) Commit(message string) (git.CommitHash, error) {
	m.CommitCalled = true
	m.CommitMessage = message
	return git.CommitHash{}, m.ReturnError
}

func (m *MockGitClient) Push() error {
	m.PushCalled = true
	return m.ReturnError
}

func (m *MockGitClient) EnsureRepo() error {
	m.EnsureCalled = true
	return m.ReturnError
}

func TestSetupGitRepo(t *testing.T) {
	mockFS := NewMockFS()

	testCases := []struct {
		name        string
		userID      int
		workspaceID int
		gitURL      string
		gitUser     string
		gitToken    string
		commitEmail string
		mockErr     error
		wantErr     bool
	}{
		{
			name:        "successful setup",
			userID:      1,
			workspaceID: 1,
			gitURL:      "https://github.com/user/repo",
			gitUser:     "user",
			gitToken:    "token",
			commitEmail: "test@example.com",
			mockErr:     nil,
			wantErr:     false,
		},
		{
			name:        "git initialization error",
			userID:      1,
			workspaceID: 2,
			gitURL:      "https://github.com/user/repo",
			gitUser:     "user",
			gitToken:    "token",
			commitEmail: "test@example.com",
			mockErr:     errors.New("git initialization failed"),
			wantErr:     true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create a mock client with the desired error behavior
			mockClient := &MockGitClient{ReturnError: tc.mockErr}

			// Create a client factory that returns our configured mock
			mockClientFactory := func(_, _, _, _, _, _ string) git.Client {
				return mockClient
			}

			s := storage.NewServiceWithOptions("test-root", storage.Options{
				Fs:           mockFS,
				NewGitClient: mockClientFactory,
			})

			// Setup the git repo
			err := s.SetupGitRepo(tc.userID, tc.workspaceID, tc.gitURL, tc.gitUser, tc.gitToken, tc.gitUser, tc.commitEmail)

			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			// Check if client was stored correctly
			client, ok := s.GitRepos[tc.userID][tc.workspaceID]
			if !ok {
				t.Fatal("git client was not stored in service")
			}

			if !mockClient.EnsureCalled {
				t.Error("EnsureRepo was not called")
			}

			// Verify it's our mock client
			if client != mockClient {
				t.Error("stored client is not our mock client")
			}
		})
	}
}

func TestGitOperations(t *testing.T) {
	mockFS := NewMockFS()
	s := storage.NewServiceWithOptions("test-root", storage.Options{
		Fs:           mockFS,
		NewGitClient: func(_, _, _, _, _, _ string) git.Client { return &MockGitClient{} },
	})

	t.Run("operations on non-configured workspace", func(t *testing.T) {
		_, err := s.StageCommitAndPush(1, 1, "test commit")
		if err == nil {
			t.Error("expected error for non-configured workspace, got nil")
		}

		err = s.Pull(1, 1)
		if err == nil {
			t.Error("expected error for non-configured workspace, got nil")
		}
	})

	t.Run("successful operations", func(t *testing.T) {
		// Initialize GitRepos map
		s.GitRepos = make(map[int]map[int]git.Client)
		s.GitRepos[1] = make(map[int]git.Client)
		mockClient := &MockGitClient{}
		s.GitRepos[1][1] = mockClient

		// Test commit and push
		_, err := s.StageCommitAndPush(1, 1, "test commit")
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if !mockClient.CommitCalled {
			t.Error("Commit was not called")
		}
		if mockClient.CommitMessage != "test commit" {
			t.Errorf("Commit message = %q, want %q", mockClient.CommitMessage, "test commit")
		}
		if !mockClient.PushCalled {
			t.Error("Push was not called")
		}

		// Test pull
		err = s.Pull(1, 1)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if !mockClient.PullCalled {
			t.Error("Pull was not called")
		}
	})

	t.Run("operation errors", func(t *testing.T) {
		// Initialize GitRepos map with error-returning client
		s.GitRepos = make(map[int]map[int]git.Client)
		s.GitRepos[1] = make(map[int]git.Client)
		mockClient := &MockGitClient{ReturnError: errors.New("git operation failed")}
		s.GitRepos[1][1] = mockClient

		// Test commit error
		_, err := s.StageCommitAndPush(1, 1, "test commit")
		if err == nil {
			t.Error("expected error for commit, got nil")
		}

		// Test pull error
		err = s.Pull(1, 1)
		if err == nil {
			t.Error("expected error for pull, got nil")
		}
	})
}

func TestDisableGitRepo(t *testing.T) {
	mockFS := NewMockFS()
	s := storage.NewServiceWithOptions("test-root", storage.Options{
		Fs:           mockFS,
		NewGitClient: func(_, _, _, _, _, _ string) git.Client { return &MockGitClient{} },
	})

	testCases := []struct {
		name        string
		userID      int
		workspaceID int
		setupRepo   bool
	}{
		{
			name:        "disable existing repo",
			userID:      1,
			workspaceID: 1,
			setupRepo:   true,
		},
		{
			name:        "disable non-existent repo",
			userID:      2,
			workspaceID: 1,
			setupRepo:   false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Reset GitRepos for each test
			s.GitRepos = make(map[int]map[int]git.Client)

			if tc.setupRepo {
				// Setup initial repo
				s.GitRepos[tc.userID] = make(map[int]git.Client)
				s.GitRepos[tc.userID][tc.workspaceID] = &MockGitClient{}
			}

			// Disable the repo
			s.DisableGitRepo(tc.userID, tc.workspaceID)

			// Verify repo was removed
			if userRepos, exists := s.GitRepos[tc.userID]; exists {
				if _, repoExists := userRepos[tc.workspaceID]; repoExists {
					t.Error("git repo still exists after disable")
				}
			}

			// If this was the user's last repo, verify user entry was cleaned up
			if tc.setupRepo {
				if len(s.GitRepos[tc.userID]) > 0 {
					t.Error("user's git repos map not cleaned up when last repo removed")
				}
			}
		})
	}
}
