//go:build integration

package handlers_test

import (
	"fmt"
)

// MockGitClient implements the git.Client interface for testing
type MockGitClient struct {
	initialized   bool
	cloned        bool
	lastCommitMsg string
	error         error

	pullCount   int
	commitCount int
	pushCount   int
	cloneCount  int
	ensureCount int
}

// NewMockGitClient creates a new mock git client
func NewMockGitClient(shouldError bool) *MockGitClient {
	var err error
	if shouldError {
		err = fmt.Errorf("mock git error")
	}
	return &MockGitClient{
		error: err,
	}
}

// Clone implements git.Client
func (m *MockGitClient) Clone() error {
	if m.error != nil {
		return m.error
	}
	m.cloneCount++
	m.cloned = true
	return nil
}

// Pull implements git.Client
func (m *MockGitClient) Pull() error {
	if m.error != nil {
		return m.error
	}
	m.pullCount++
	return nil
}

// Commit implements git.Client
func (m *MockGitClient) Commit(message string) error {
	if m.error != nil {
		return m.error
	}
	m.commitCount++
	m.lastCommitMsg = message
	return nil
}

// Push implements git.Client
func (m *MockGitClient) Push() error {
	if m.error != nil {
		return m.error
	}
	m.pushCount++
	return nil
}

// EnsureRepo implements git.Client
func (m *MockGitClient) EnsureRepo() error {
	if m.error != nil {
		return m.error
	}
	m.ensureCount++
	m.initialized = true
	return nil
}

// Helper methods for tests

func (m *MockGitClient) GetCommitCount() int {
	return m.commitCount
}

func (m *MockGitClient) GetPushCount() int {
	return m.pushCount
}

func (m *MockGitClient) GetPullCount() int {
	return m.pullCount
}

func (m *MockGitClient) GetLastCommitMessage() string {
	return m.lastCommitMsg
}

func (m *MockGitClient) IsInitialized() bool {
	return m.initialized
}

func (m *MockGitClient) IsCloned() bool {
	return m.cloned
}

// Reset resets all counters and states
func (m *MockGitClient) Reset() {
	m.initialized = false
	m.cloned = false
	m.lastCommitMsg = ""
	m.pullCount = 0
	m.commitCount = 0
	m.pushCount = 0
	m.cloneCount = 0
	m.ensureCount = 0
}

// SetError sets the error state
func (m *MockGitClient) SetError(err error) {
	m.error = err
}
