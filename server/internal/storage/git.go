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
	log := getLogger()
	log.Info("setting up git repository",
		"userID", userID,
		"workspaceID", workspaceID,
	)

	workspacePath := s.GetWorkspacePath(userID, workspaceID)

	if _, ok := s.GitRepos[userID]; !ok {
		log.Debug("initializing git repo map for user",
			"userID", userID)
		s.GitRepos[userID] = make(map[int]git.Client)
	}

	s.GitRepos[userID][workspaceID] = s.newGitClient(gitURL, gitUser, gitToken, workspacePath, commitName, commitEmail)

	return s.GitRepos[userID][workspaceID].EnsureRepo()
}

// DisableGitRepo disables the Git repository for the given userID and workspaceID.
func (s *Service) DisableGitRepo(userID, workspaceID int) {
	log := getLogger()
	log.Info("disabling git repository",
		"userID", userID,
		"workspaceID", workspaceID)

	if userRepos, ok := s.GitRepos[userID]; ok {
		delete(userRepos, workspaceID)
		if len(userRepos) == 0 {
			log.Debug("removing empty user git repos map",
				"userID", userID)
			delete(s.GitRepos, userID)
		}
	}
}

// StageCommitAndPush stages, commit with the message, and pushes the changes to the Git repository.
// The git repository belongs to the given userID and is associated with the given workspaceID.
func (s *Service) StageCommitAndPush(userID, workspaceID int, message string) (git.CommitHash, error) {
	log := getLogger()
	log.Debug("preparing to stage, commit and push changes",
		"userID", userID,
		"workspaceID", workspaceID,
		"message", message)

	repo, ok := s.getGitRepo(userID, workspaceID)
	if !ok {
		return git.CommitHash{}, fmt.Errorf("git settings not configured for this workspace")
	}

	hash, err := repo.Commit(message)
	if err != nil {
		return git.CommitHash{}, err
	}

	if err = repo.Push(); err != nil {
		return hash, err
	}

	log.Debug("changes committed and pushed",
		"userID", userID,
		"workspaceID", workspaceID,
		"commitHash", hash.String())
	return hash, nil
}

// Pull pulls the changes from the remote Git repository.
// The git repository belongs to the given userID and is associated with the given workspaceID.
func (s *Service) Pull(userID, workspaceID int) error {
	log := getLogger()
	log.Debug("preparing to pull changes",
		"userID", userID,
		"workspaceID", workspaceID)

	repo, ok := s.getGitRepo(userID, workspaceID)
	if !ok {
		return fmt.Errorf("git settings not configured for this workspace")
	}

	err := repo.Pull()
	if err != nil {
		return err
	}

	log.Debug("changes pulled from remote",
		"userID", userID,
		"workspaceID", workspaceID)
	return nil
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
