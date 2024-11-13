package filesystem

import (
	"fmt"
	"novamd/internal/gitutils"
)

// SetupGitRepo sets up a Git repository for the given user and workspace IDs.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace to set up the Git repository for
// - gitURL: the URL of the Git repository
// - gitUser: the username for the Git repository
// - gitToken: the access token for the Git repository
// Returns:
// - error: any error that occurred during setup
func (s *Storage) SetupGitRepo(userID, workspaceID int, gitURL, gitUser, gitToken string) error {
	workspacePath := s.GetWorkspacePath(userID, workspaceID)
	if _, ok := s.GitRepos[userID]; !ok {
		s.GitRepos[userID] = make(map[int]*gitutils.GitRepo)
	}
	s.GitRepos[userID][workspaceID] = gitutils.New(gitURL, gitUser, gitToken, workspacePath)
	return s.GitRepos[userID][workspaceID].EnsureRepo()
}

// DisableGitRepo disables the Git repository for the given user and workspace IDs.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace to disable the Git repository for
func (s *Storage) DisableGitRepo(userID, workspaceID int) {
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
func (s *Storage) StageCommitAndPush(userID, workspaceID int, message string) error {
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
func (s *Storage) Pull(userID, workspaceID int) error {
	repo, ok := s.getGitRepo(userID, workspaceID)
	if !ok {
		return fmt.Errorf("git settings not configured for this workspace")
	}

	return repo.Pull()
}

// getGitRepo returns the Git repository for the given user and workspace IDs.
func (s *Storage) getGitRepo(userID, workspaceID int) (*gitutils.GitRepo, bool) {
	userRepos, ok := s.GitRepos[userID]
	if !ok {
		return nil, false
	}
	repo, ok := userRepos[workspaceID]
	return repo, ok
}
