//go:build integration

package handlers_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"testing"

	"novamd/internal/models"
	"novamd/internal/storage"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFileHandlers_Integration(t *testing.T) {
	h := setupTestHarness(t)
	defer h.teardown(t)

	t.Run("file operations", func(t *testing.T) {
		// Setup: Create a workspace first
		workspace := &models.Workspace{
			UserID: h.RegularUser.ID,
			Name:   "File Test Workspace",
		}
		rr := h.makeRequest(t, http.MethodPost, "/api/v1/workspaces", workspace, h.RegularToken, nil)
		require.Equal(t, http.StatusOK, rr.Code)

		err := json.NewDecoder(rr.Body).Decode(workspace)
		require.NoError(t, err)

		// Construct base URL for file operations
		baseURL := fmt.Sprintf("/api/v1/workspaces/%s/files", url.PathEscape(workspace.Name))

		t.Run("list empty directory", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, baseURL, nil, h.RegularToken, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var files []storage.FileNode
			err := json.NewDecoder(rr.Body).Decode(&files)
			require.NoError(t, err)
			assert.Empty(t, files, "Expected empty directory")
		})

		t.Run("save and get file", func(t *testing.T) {
			content := "Test content for file operations"
			filePath := "test.md"

			// Save file
			rr := h.makeRequestRaw(t, http.MethodPost, baseURL+"/"+filePath, strings.NewReader(content), h.RegularToken, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			// Get file content
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/"+filePath, nil, h.RegularToken, nil)
			require.Equal(t, http.StatusOK, rr.Code)
			assert.Equal(t, content, rr.Body.String())

			// List directory should now show the file
			rr = h.makeRequest(t, http.MethodGet, baseURL, nil, h.RegularToken, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var files []storage.FileNode
			err := json.NewDecoder(rr.Body).Decode(&files)
			require.NoError(t, err)
			assert.Len(t, files, 1)
			assert.Equal(t, filePath, files[0].Name)
		})

		t.Run("save and list nested files", func(t *testing.T) {
			files := map[string]string{
				"docs/readme.md":         "README content",
				"docs/api/endpoints.md":  "API documentation",
				"notes/meeting-notes.md": "Meeting notes content",
				"notes/todo.md":          "TODO list",
			}

			// Create all files
			for path, content := range files {
				rr := h.makeRequest(t, http.MethodPost, baseURL+"/"+path, content, h.RegularToken, nil)
				require.Equal(t, http.StatusOK, rr.Code)
			}

			// List all files
			rr := h.makeRequest(t, http.MethodGet, baseURL, nil, h.RegularToken, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var fileNodes []storage.FileNode
			err := json.NewDecoder(rr.Body).Decode(&fileNodes)
			require.NoError(t, err)

			// We should have 3 root items: docs/, notes/, and test.md
			assert.Len(t, fileNodes, 3)

			// Verify directory structure
			var docsDir, notesDir *storage.FileNode
			for i := range fileNodes {
				switch fileNodes[i].Name {
				case "docs":
					docsDir = &fileNodes[i]
				case "notes":
					notesDir = &fileNodes[i]
				}
			}

			require.NotNil(t, docsDir)
			require.NotNil(t, notesDir)
			assert.Len(t, docsDir.Children, 2)  // readme.md and api/
			assert.Len(t, notesDir.Children, 2) // meeting-notes.md and todo.md
		})

		t.Run("lookup file by name", func(t *testing.T) {
			// Look up a file that exists in multiple locations
			filename := "readme.md"
			dupContent := "Another readme"
			rr := h.makeRequest(t, http.MethodPost, baseURL+"/projects/"+filename, dupContent, h.RegularToken, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			// Search for the file
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/lookup?filename="+filename, nil, h.RegularToken, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var response struct {
				Paths []string `json:"paths"`
			}
			err := json.NewDecoder(rr.Body).Decode(&response)
			require.NoError(t, err)
			assert.Len(t, response.Paths, 2)

			// Search for non-existent file
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/lookup?filename=nonexistent.md", nil, h.RegularToken, nil)
			assert.Equal(t, http.StatusNotFound, rr.Code)
		})

		t.Run("delete file", func(t *testing.T) {
			filePath := "to-delete.md"
			content := "This file will be deleted"

			// Create file
			rr := h.makeRequest(t, http.MethodPost, baseURL+"/"+filePath, content, h.RegularToken, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			// Delete file
			rr = h.makeRequest(t, http.MethodDelete, baseURL+"/"+filePath, nil, h.RegularToken, nil)
			require.Equal(t, http.StatusNoContent, rr.Code)

			// Verify file is gone
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/"+filePath, nil, h.RegularToken, nil)
			assert.Equal(t, http.StatusNotFound, rr.Code)
		})

		t.Run("last opened file", func(t *testing.T) {
			// Initially should be empty
			rr := h.makeRequest(t, http.MethodGet, baseURL+"/last", nil, h.RegularToken, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var response struct {
				LastOpenedFilePath string `json:"lastOpenedFilePath"`
			}
			err := json.NewDecoder(rr.Body).Decode(&response)
			require.NoError(t, err)
			assert.Empty(t, response.LastOpenedFilePath)

			// Update last opened file
			updateReq := struct {
				FilePath string `json:"filePath"`
			}{
				FilePath: "docs/readme.md",
			}
			rr = h.makeRequest(t, http.MethodPut, baseURL+"/last", updateReq, h.RegularToken, nil)
			require.Equal(t, http.StatusNoContent, rr.Code)

			// Verify update
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/last", nil, h.RegularToken, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			err = json.NewDecoder(rr.Body).Decode(&response)
			require.NoError(t, err)
			assert.Equal(t, updateReq.FilePath, response.LastOpenedFilePath)

			// Test invalid file path
			updateReq.FilePath = "nonexistent.md"
			rr = h.makeRequest(t, http.MethodPut, baseURL+"/last", updateReq, h.RegularToken, nil)
			assert.Equal(t, http.StatusNotFound, rr.Code)
		})

		t.Run("unauthorized access", func(t *testing.T) {
			tests := []struct {
				name   string
				method string
				path   string
				body   interface{}
			}{
				{"list files", http.MethodGet, baseURL, nil},
				{"get file", http.MethodGet, baseURL + "/test.md", nil},
				{"save file", http.MethodPost, baseURL + "/test.md", "content"},
				{"delete file", http.MethodDelete, baseURL + "/test.md", nil},
				{"get last file", http.MethodGet, baseURL + "/last", nil},
				{"update last file", http.MethodPut, baseURL + "/last", struct{ FilePath string }{"test.md"}},
			}

			for _, tc := range tests {
				t.Run(tc.name, func(t *testing.T) {
					// Test without token
					rr := h.makeRequest(t, tc.method, tc.path, tc.body, "", nil)
					assert.Equal(t, http.StatusUnauthorized, rr.Code)

					// Test with wrong user's token
					rr = h.makeRequest(t, tc.method, tc.path, tc.body, h.AdminToken, nil)
					assert.Equal(t, http.StatusNotFound, rr.Code)
				})
			}
		})

		t.Run("path traversal attempts", func(t *testing.T) {
			maliciousPaths := []string{
				"../../../etc/passwd",
				"./../../secret.txt",
				"/etc/shadow",
				"test/../../../etc/passwd",
			}

			for _, path := range maliciousPaths {
				t.Run(path, func(t *testing.T) {
					// Try to read
					rr := h.makeRequest(t, http.MethodGet, baseURL+"/"+path, nil, h.RegularToken, nil)
					assert.Equal(t, http.StatusBadRequest, rr.Code)

					// Try to write
					rr = h.makeRequest(t, http.MethodPost, baseURL+"/"+path, "malicious content", h.RegularToken, nil)
					assert.Equal(t, http.StatusBadRequest, rr.Code)
				})
			}
		})
	})
}
