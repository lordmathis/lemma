package filesystem

import (
	"errors"
	"novamd/internal/gitutils"
)

// SetupGitRepo sets up a Git repository for the given user and workspace IDs.
func (fs *FileSystem) SetupGitRepo(userID, workspaceID int, gitURL, gitUser, gitToken string) error {
	workspacePath := fs.GetWorkspacePath(userID, workspaceID)
	if _, ok := fs.GitRepos[userID]; !ok {
		fs.GitRepos[userID] = make(map[int]*gitutils.GitRepo)
	}
	fs.GitRepos[userID][workspaceID] = gitutils.New(gitURL, gitUser, gitToken, workspacePath)
	return fs.GitRepos[userID][workspaceID].EnsureRepo()
}

// DisableGitRepo disables the Git repository for the given user and workspace IDs.
func (fs *FileSystem) DisableGitRepo(userID, workspaceID int) {
	if userRepos, ok := fs.GitRepos[userID]; ok {
		delete(userRepos, workspaceID)
		if len(userRepos) == 0 {
			delete(fs.GitRepos, userID)
		}
	}
}

// StageCommitAndPush stages, commits, and pushes the changes to the Git repository.
func (fs *FileSystem) StageCommitAndPush(userID, workspaceID int, message string) error {
	repo, ok := fs.getGitRepo(userID, workspaceID)
	if !ok {
		return errors.New("git settings not configured for this workspace")
	}

	if err := repo.Commit(message); err != nil {
		return err
	}

	return repo.Push()
}

// Pull pulls the changes from the remote Git repository.
func (fs *FileSystem) Pull(userID, workspaceID int) error {
	repo, ok := fs.getGitRepo(userID, workspaceID)
	if !ok {
		return errors.New("git settings not configured for this workspace")
	}

	return repo.Pull()
}

// getGitRepo returns the Git repository for the given user and workspace IDs.
func (fs *FileSystem) getGitRepo(userID, workspaceID int) (*gitutils.GitRepo, bool) {
	userRepos, ok := fs.GitRepos[userID]
	if !ok {
		return nil, false
	}
	repo, ok := userRepos[workspaceID]
	return repo, ok
}
