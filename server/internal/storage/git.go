package storage

import (
	"fmt"
	"novamd/internal/git"
)

// RepositoryManager defines the interface for managing Git repositories.
type RepositoryManager interface {
	SetupGitRepo(userID, workspaceID int, gitURL, gitUser, gitToken, commitName, commitEmail string) error
	DisableGitRepo(userID, workspaceID int)
	StageCommitAndPush(userID, workspaceID int, message string) (git.CommitHash, error)
	Pull(userID, workspaceID int) error
}

// SetupGitRepo sets up a Git repository for the given userID and workspaceID.
// The repository is cloned from the given gitURL using the given gitUser and gitToken.
func (s *Service) SetupGitRepo(userID, workspaceID int, gitURL, gitUser, gitToken, commitName, commitEmail string) error {
	workspacePath := s.GetWorkspacePath(userID, workspaceID)
	if _, ok := s.GitRepos[userID]; !ok {
		s.GitRepos[userID] = make(map[int]git.Client)
	}
	s.GitRepos[userID][workspaceID] = s.newGitClient(gitURL, gitUser, gitToken, workspacePath, commitName, commitEmail)
	return s.GitRepos[userID][workspaceID].EnsureRepo()
}

// DisableGitRepo disables the Git repository for the given userID and workspaceID.
func (s *Service) DisableGitRepo(userID, workspaceID int) {
	if userRepos, ok := s.GitRepos[userID]; ok {
		delete(userRepos, workspaceID)
		if len(userRepos) == 0 {
			delete(s.GitRepos, userID)
		}
	}
}

// StageCommitAndPush stages, commit with the message, and pushes the changes to the Git repository.
// The git repository belongs to the given userID and is associated with the given workspaceID.
func (s *Service) StageCommitAndPush(userID, workspaceID int, message string) (git.CommitHash, error) {
	repo, ok := s.getGitRepo(userID, workspaceID)
	if !ok {
		return git.CommitHash{}, fmt.Errorf("git settings not configured for this workspace")
	}

	hash, err := repo.Commit(message)
	if err != nil {
		return git.CommitHash{}, err
	}

	err = repo.Push()
	return hash, err
}

// Pull pulls the changes from the remote Git repository.
// The git repository belongs to the given userID and is associated with the given workspaceID.
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
