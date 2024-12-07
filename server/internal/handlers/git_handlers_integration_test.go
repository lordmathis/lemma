//go:build integration

package handlers_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"testing"

	"novamd/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGitHandlers_Integration(t *testing.T) {
	h := setupTestHarness(t)
	defer h.teardown(t)

	t.Run("git operations", func(t *testing.T) {
		// Setup: Create a workspace with Git enabled
		workspace := &models.Workspace{
			UserID:               h.RegularUser.ID,
			Name:                 "Git Test Workspace",
			GitEnabled:           true,
			GitURL:               "https://github.com/test/repo.git",
			GitUser:              "testuser",
			GitToken:             "testtoken",
			GitAutoCommit:        true,
			GitCommitMsgTemplate: "Update: {{message}}",
		}

		rr := h.makeRequest(t, http.MethodPost, "/api/v1/workspaces", workspace, h.RegularSession)
		require.Equal(t, http.StatusOK, rr.Code)

		err := json.NewDecoder(rr.Body).Decode(workspace)
		require.NoError(t, err)

		// Construct base URL for Git operations
		baseURL := "/api/v1/workspaces/" + url.PathEscape(workspace.Name) + "/git"

		t.Run("stage, commit and push", func(t *testing.T) {
			h.MockGit.Reset()

			t.Run("successful commit", func(t *testing.T) {
				commitMsg := "Test commit message"
				requestBody := map[string]string{
					"message": commitMsg,
				}

				rr := h.makeRequest(t, http.MethodPost, baseURL+"/commit", requestBody, h.RegularSession)
				require.Equal(t, http.StatusOK, rr.Code)

				var response map[string]string
				err := json.NewDecoder(rr.Body).Decode(&response)
				require.NoError(t, err)
				require.Contains(t, response, "commitHash")

				// Verify mock was called correctly
				assert.Equal(t, 1, h.MockGit.GetCommitCount(), "Commit should be called once")
				assert.Equal(t, 1, h.MockGit.GetPushCount(), "Push should be called once")
				assert.Equal(t, commitMsg, h.MockGit.GetLastCommitMessage(), "Commit message should match")
			})

			t.Run("empty commit message", func(t *testing.T) {
				h.MockGit.Reset()
				requestBody := map[string]string{
					"message": "",
				}

				rr := h.makeRequest(t, http.MethodPost, baseURL+"/commit", requestBody, h.RegularSession)
				assert.Equal(t, http.StatusBadRequest, rr.Code)
				assert.Equal(t, 0, h.MockGit.GetCommitCount(), "Commit should not be called")
			})

			t.Run("git error", func(t *testing.T) {
				h.MockGit.Reset()
				h.MockGit.SetError(fmt.Errorf("mock git error"))

				requestBody := map[string]string{
					"message": "Test message",
				}

				rr := h.makeRequest(t, http.MethodPost, baseURL+"/commit", requestBody, h.RegularSession)
				assert.Equal(t, http.StatusInternalServerError, rr.Code)

				h.MockGit.SetError(nil) // Reset error state
			})
		})

		t.Run("pull changes", func(t *testing.T) {
			h.MockGit.Reset()

			t.Run("successful pull", func(t *testing.T) {
				rr := h.makeRequest(t, http.MethodPost, baseURL+"/pull", nil, h.RegularSession)
				require.Equal(t, http.StatusOK, rr.Code)

				var response map[string]string
				err := json.NewDecoder(rr.Body).Decode(&response)
				require.NoError(t, err)
				assert.Contains(t, response["message"], "Successfully pulled changes")

				assert.Equal(t, 1, h.MockGit.GetPullCount(), "Pull should be called once")
			})

			t.Run("git error", func(t *testing.T) {
				h.MockGit.Reset()
				h.MockGit.SetError(fmt.Errorf("mock git error"))

				rr := h.makeRequest(t, http.MethodPost, baseURL+"/pull", nil, h.RegularSession)
				assert.Equal(t, http.StatusInternalServerError, rr.Code)

				h.MockGit.SetError(nil) // Reset error state
			})
		})

		t.Run("unauthorized access", func(t *testing.T) {
			h.MockGit.Reset()

			tests := []struct {
				name   string
				method string
				path   string
				body   interface{}
			}{
				{
					name:   "commit without token",
					method: http.MethodPost,
					path:   baseURL + "/commit",
					body:   map[string]string{"message": "test"},
				},
				{
					name:   "pull without token",
					method: http.MethodPost,
					path:   baseURL + "/pull",
				},
			}

			for _, tc := range tests {
				t.Run(tc.name, func(t *testing.T) {
					// Test without session
					rr := h.makeRequest(t, tc.method, tc.path, tc.body, nil)
					assert.Equal(t, http.StatusUnauthorized, rr.Code)

					// Test with wrong user's session
					rr = h.makeRequest(t, tc.method, tc.path, tc.body, h.AdminSession)
					assert.Equal(t, http.StatusNotFound, rr.Code)
				})
			}
		})

		t.Run("workspace without git", func(t *testing.T) {
			h.MockGit.Reset()

			// Create a workspace without Git enabled
			nonGitWorkspace := &models.Workspace{
				UserID: h.RegularUser.ID,
				Name:   "Non-Git Workspace",
			}

			rr := h.makeRequest(t, http.MethodPost, "/api/v1/workspaces", nonGitWorkspace, h.RegularSession)
			require.Equal(t, http.StatusOK, rr.Code)

			err := json.NewDecoder(rr.Body).Decode(nonGitWorkspace)
			require.NoError(t, err)

			nonGitBaseURL := "/api/v1/workspaces/" + url.PathEscape(nonGitWorkspace.Name) + "/git"

			// Try to commit
			commitMsg := map[string]string{"message": "test"}
			rr = h.makeRequest(t, http.MethodPost, nonGitBaseURL+"/commit", commitMsg, h.RegularSession)
			assert.Equal(t, http.StatusInternalServerError, rr.Code)

			// Try to pull
			rr = h.makeRequest(t, http.MethodPost, nonGitBaseURL+"/pull", nil, h.RegularSession)
			assert.Equal(t, http.StatusInternalServerError, rr.Code)
		})
	})
}
