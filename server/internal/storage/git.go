package storage

import (
	"fmt"
	"novamd/internal/git"
)

// RepositoryManager defines the interface for managing Git repositories.
type RepositoryManager interface {
	SetupGitRepo(userID, workspaceID int, gitURL, gitUser, gitToken string) error
	DisableGitRepo(userID, workspaceID int)
	StageCommitAndPush(userID, workspaceID int, message string) error
	Pull(userID, workspaceID int) error
}

// SetupGitRepo sets up a Git repository for the given user and workspace IDs.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace to set up the Git repository for
// - gitURL: the URL of the Git repository
// - gitUser: the username for the Git repository
// - gitToken: the access token for the Git repository
// Returns:
// - error: any error that occurred during setup
func (s *Service) SetupGitRepo(userID, workspaceID int, gitURL, gitUser, gitToken string) error {
	workspacePath := s.GetWorkspacePath(userID, workspaceID)
	if _, ok := s.GitRepos[userID]; !ok {
		s.GitRepos[userID] = make(map[int]git.Client)
	}
	s.GitRepos[userID][workspaceID] = git.New(gitURL, gitUser, gitToken, workspacePath)
	return s.GitRepos[userID][workspaceID].EnsureRepo()
}

// DisableGitRepo disables the Git repository for the given user and workspace IDs.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace to disable the Git repository for
func (s *Service) DisableGitRepo(userID, workspaceID int) {
	if userRepos, ok := s.GitRepos[userID]; ok {
		delete(userRepos, workspaceID)
		if len(userRepos) == 0 {
			delete(s.GitRepos, userID)
		}
	}
}

// StageCommitAndPush stages, commits, and pushes the changes to the Git repository.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace to commit and push
// - message: the commit message
// Returns:
// - error: any error that occurred during the operation
func (s *Service) StageCommitAndPush(userID, workspaceID int, message string) error {
	repo, ok := s.getGitRepo(userID, workspaceID)
	if !ok {
		return fmt.Errorf("git settings not configured for this workspace")
	}

	if err := repo.Commit(message); err != nil {
		return err
	}

	return repo.Push()
}

// Pull pulls the changes from the remote Git repository.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace to pull changes for
// Returns:
// - error: any error that occurred during the operation
func (s *Service) Pull(userID, workspaceID int) error {
	repo, ok := s.getGitRepo(userID, workspaceID)
	if !ok {
		return fmt.Errorf("git settings not configured for this workspace")
	}

	return repo.Pull()
}

// getGitRepo returns the Git repository for the given user and workspace IDs.
func (s *Service) getGitRepo(userID, workspaceID int) (git.Client, bool) {
	userRepos, ok := s.GitRepos[userID]
	if !ok {
		return nil, false
	}
	repo, ok := userRepos[workspaceID]
	return repo, ok
}
