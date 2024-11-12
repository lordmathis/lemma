package gitutils

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
)

type GitRepo struct {
	URL      string
	Username string
	Token    string
	WorkDir  string
	repo     *git.Repository
}

func New(url, username, token, workDir string) *GitRepo {
	return &GitRepo{
		URL:      url,
		Username: username,
		Token:    token,
		WorkDir:  workDir,
	}
}

func (g *GitRepo) Clone() error {
	auth := &http.BasicAuth{
		Username: g.Username,
		Password: g.Token,
	}

	var err error
	g.repo, err = git.PlainClone(g.WorkDir, false, &git.CloneOptions{
		URL:      g.URL,
		Auth:     auth,
		Progress: os.Stdout,
	})

	if err != nil {
		return fmt.Errorf("failed to clone repository: %w", err)
	}

	return nil
}

func (g *GitRepo) Pull() error {
	if g.repo == nil {
		return fmt.Errorf("repository not initialized")
	}

	w, err := g.repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	auth := &http.BasicAuth{
		Username: g.Username,
		Password: g.Token,
	}

	err = w.Pull(&git.PullOptions{
		Auth:     auth,
		Progress: os.Stdout,
	})

	if err != nil && err != git.NoErrAlreadyUpToDate {
		return fmt.Errorf("failed to pull changes: %w", err)
	}

	return nil
}

func (g *GitRepo) Commit(message string) error {
	if g.repo == nil {
		return fmt.Errorf("repository not initialized")
	}

	w, err := g.repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	_, err = w.Add(".")
	if err != nil {
		return fmt.Errorf("failed to add changes: %w", err)
	}

	_, err = w.Commit(message, &git.CommitOptions{})
	if err != nil {
		return fmt.Errorf("failed to commit changes: %w", err)
	}

	return nil
}

func (g *GitRepo) Push() error {
	if g.repo == nil {
		return fmt.Errorf("repository not initialized")
	}

	auth := &http.BasicAuth{
		Username: g.Username,
		Password: g.Token,
	}

	err := g.repo.Push(&git.PushOptions{
		Auth:     auth,
		Progress: os.Stdout,
	})

	if err != nil && err != git.NoErrAlreadyUpToDate {
		return fmt.Errorf("failed to push changes: %w", err)
	}

	return nil
}

func (g *GitRepo) EnsureRepo() error {
	if _, err := os.Stat(filepath.Join(g.WorkDir, ".git")); os.IsNotExist(err) {
		return g.Clone()
	}

	var err error
	g.repo, err = git.PlainOpen(g.WorkDir)
	if err != nil {
		return fmt.Errorf("failed to open existing repository: %w", err)
	}

	return g.Pull()
}
