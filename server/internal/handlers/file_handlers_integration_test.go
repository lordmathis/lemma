//go:build integration

package handlers_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"testing"

	"lemma/internal/models"
	"lemma/internal/storage"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFileHandlers_Integration(t *testing.T) {
	runWithDatabases(t, testFileHandlers)
}

func testFileHandlers(t *testing.T, dbConfig DatabaseConfig) {
	h := setupTestHarness(t, dbConfig)
	defer h.teardown(t)

	t.Run("file operations", func(t *testing.T) {
		// Setup: Create a workspace first
		workspace := &models.Workspace{
			UserID: h.RegularTestUser.session.UserID,
			Name:   "File Test Workspace",
		}
		rr := h.makeRequest(t, http.MethodPost, "/api/v1/workspaces", workspace, h.RegularTestUser)
		require.Equal(t, http.StatusOK, rr.Code)

		err := json.NewDecoder(rr.Body).Decode(workspace)
		require.NoError(t, err)

		// Construct base URL for file operations
		baseURL := fmt.Sprintf("/api/v1/workspaces/%s/files", url.PathEscape(workspace.Name))

		t.Run("list empty directory", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, baseURL, nil, h.RegularTestUser)
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
			rr := h.makeRequestRaw(t, http.MethodPost, baseURL+"?file_path="+url.QueryEscape(filePath), strings.NewReader(content), h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			// Get file content
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/content?file_path="+url.QueryEscape(filePath), nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)
			assert.Equal(t, content, rr.Body.String())

			// List directory should now show the file
			rr = h.makeRequest(t, http.MethodGet, baseURL, nil, h.RegularTestUser)
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
				rr := h.makeRequest(t, http.MethodPost, baseURL+"?file_path="+url.QueryEscape(path), content, h.RegularTestUser)
				require.Equal(t, http.StatusOK, rr.Code)
			}

			// List all files
			rr := h.makeRequest(t, http.MethodGet, baseURL, nil, h.RegularTestUser)
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
			rr := h.makeRequest(t, http.MethodPost, baseURL+"?file_path="+url.QueryEscape("projects/"+filename), dupContent, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			// Search for the file
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/lookup?filename="+url.QueryEscape(filename), nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var response struct {
				Paths []string `json:"paths"`
			}
			err := json.NewDecoder(rr.Body).Decode(&response)
			require.NoError(t, err)
			assert.Len(t, response.Paths, 2)

			// Search for non-existent file
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/lookup?filename="+url.QueryEscape("nonexistent.md"), nil, h.RegularTestUser)
			assert.Equal(t, http.StatusNotFound, rr.Code)
		})

		t.Run("delete file", func(t *testing.T) {
			filePath := "to-delete.md"
			content := "This file will be deleted"

			// Create file
			rr := h.makeRequest(t, http.MethodPost, baseURL+"?file_path="+url.QueryEscape(filePath), content, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			// Delete file
			rr = h.makeRequest(t, http.MethodDelete, baseURL+"?file_path="+url.QueryEscape(filePath), nil, h.RegularTestUser)
			require.Equal(t, http.StatusNoContent, rr.Code)

			// Verify file is gone
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/content?file_path="+url.QueryEscape(filePath), nil, h.RegularTestUser)
			assert.Equal(t, http.StatusNotFound, rr.Code)
		})

		t.Run("move file", func(t *testing.T) {
			srcPath := "original.md"
			destPath := "moved.md"
			content := "This file will be moved"

			// Create file
			rr := h.makeRequestRaw(t, http.MethodPost, baseURL+"?file_path="+url.QueryEscape(srcPath), strings.NewReader(content), h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			// Move file
			moveURL := baseURL + "/move?src_path=" + url.QueryEscape(srcPath) + "&dest_path=" + url.QueryEscape(destPath)
			rr = h.makeRequest(t, http.MethodPost, moveURL, nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			// Verify source is gone
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/content?file_path="+url.QueryEscape(srcPath), nil, h.RegularTestUser)
			assert.Equal(t, http.StatusNotFound, rr.Code)

			// Verify destination exists with correct content
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/content?file_path="+url.QueryEscape(destPath), nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)
			assert.Equal(t, content, rr.Body.String())
		})

		t.Run("rename file in directory", func(t *testing.T) {
			srcPath := "folder/old-name.md"
			destPath := "folder/new-name.md"
			content := "This file will be renamed"

			// Create file
			rr := h.makeRequestRaw(t, http.MethodPost, baseURL+"?file_path="+url.QueryEscape(srcPath), strings.NewReader(content), h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			// Rename file (move within same directory)
			moveURL := baseURL + "/move?src_path=" + url.QueryEscape(srcPath) + "&dest_path=" + url.QueryEscape(destPath)
			rr = h.makeRequest(t, http.MethodPost, moveURL, nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			// Verify source is gone
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/content?file_path="+url.QueryEscape(srcPath), nil, h.RegularTestUser)
			assert.Equal(t, http.StatusNotFound, rr.Code)

			// Verify destination exists with correct content
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/content?file_path="+url.QueryEscape(destPath), nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)
			assert.Equal(t, content, rr.Body.String())
		})

		t.Run("last opened file", func(t *testing.T) {
			// Initially should be empty
			rr := h.makeRequest(t, http.MethodGet, baseURL+"/last", nil, h.RegularTestUser)
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
			rr = h.makeRequest(t, http.MethodPut, baseURL+"/last?file_path="+url.QueryEscape(updateReq.FilePath), nil, h.RegularTestUser)
			require.Equal(t, http.StatusNoContent, rr.Code)

			// Verify update
			rr = h.makeRequest(t, http.MethodGet, baseURL+"/last", nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			err = json.NewDecoder(rr.Body).Decode(&response)
			require.NoError(t, err)
			assert.Equal(t, updateReq.FilePath, response.LastOpenedFilePath)

			// Test invalid file path
			updateReq.FilePath = "nonexistent.md"
			rr = h.makeRequest(t, http.MethodPut, baseURL+"/last?file_path="+url.QueryEscape(updateReq.FilePath), nil, h.RegularTestUser)
			assert.Equal(t, http.StatusNotFound, rr.Code)
		})

		t.Run("unauthorized access", func(t *testing.T) {
			tests := []struct {
				name   string
				method string
				path   string
				body   any
			}{
				{"list files", http.MethodGet, baseURL, nil},
				{"get file", http.MethodGet, baseURL + "/content?file_path=" + url.QueryEscape("test.md"), nil},
				{"save file", http.MethodPost, baseURL + "?file_path=" + url.QueryEscape("test.md"), "content"},
				{"delete file", http.MethodDelete, baseURL + "?file_path=" + url.QueryEscape("test.md"), nil},
				{"get last file", http.MethodGet, baseURL + "/last", nil},
				{"update last file", http.MethodPut, baseURL + "/last?file_path=" + url.QueryEscape("test.md"), nil},
			}

			for _, tc := range tests {
				t.Run(tc.name, func(t *testing.T) {
					// Test without session
					rr := h.makeRequest(t, tc.method, tc.path, tc.body, nil)
					assert.Equal(t, http.StatusUnauthorized, rr.Code)

					// Test with wrong user's session
					rr = h.makeRequest(t, tc.method, tc.path, tc.body, h.AdminTestUser)
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
					rr := h.makeRequest(t, http.MethodGet, baseURL+"/content?file_path="+url.QueryEscape(path), nil, h.RegularTestUser)
					assert.Equal(t, http.StatusBadRequest, rr.Code)

					// Try to write
					rr = h.makeRequest(t, http.MethodPost, baseURL+"?file_path="+url.QueryEscape(path), "malicious content", h.RegularTestUser)
					assert.Equal(t, http.StatusBadRequest, rr.Code)
				})
			}
		})

		t.Run("upload file", func(t *testing.T) {
			t.Run("successful single file upload", func(t *testing.T) {
				fileName := "uploaded-test.txt"
				fileContent := "This is an uploaded file"

				files := map[string]string{fileName: fileContent}
				rr := h.makeUploadRequest(t, baseURL+"/upload?file_path="+url.QueryEscape("uploads"), files, h.RegularTestUser)
				require.Equal(t, http.StatusOK, rr.Code)

				// Verify response structure for multiple files API
				var response struct {
					FilePaths []string `json:"filePaths"`
				}
				err := json.NewDecoder(rr.Body).Decode(&response)
				require.NoError(t, err)
				require.Len(t, response.FilePaths, 1)
				assert.Equal(t, "uploads/"+fileName, response.FilePaths[0])

				// Verify file was saved
				rr = h.makeRequest(t, http.MethodGet, baseURL+"/content?file_path="+url.QueryEscape("uploads/"+fileName), nil, h.RegularTestUser)
				require.Equal(t, http.StatusOK, rr.Code)
				assert.Equal(t, fileContent, rr.Body.String())
			})

			t.Run("successful multiple files upload", func(t *testing.T) {
				files := map[string]string{
					"file1.txt": "Content of first file",
					"file2.md":  "# Content of second file",
					"file3.py":  "print('Content of third file')",
				}

				rr := h.makeUploadRequest(t, baseURL+"/upload?file_path="+url.QueryEscape("batch"), files, h.RegularTestUser)
				require.Equal(t, http.StatusOK, rr.Code)

				// Verify response structure
				var response struct {
					FilePaths []string `json:"filePaths"`
				}
				err := json.NewDecoder(rr.Body).Decode(&response)
				require.NoError(t, err)
				require.Len(t, response.FilePaths, 3)

				// Verify all files were saved with correct paths
				expectedPaths := []string{"batch/file1.txt", "batch/file2.md", "batch/file3.py"}
				for _, expectedPath := range expectedPaths {
					assert.Contains(t, response.FilePaths, expectedPath)
				}

				// Verify file contents
				for fileName, expectedContent := range files {
					filePath := "batch/" + fileName
					rr = h.makeRequest(t, http.MethodGet, baseURL+"/content?file_path="+url.QueryEscape(filePath), nil, h.RegularTestUser)
					require.Equal(t, http.StatusOK, rr.Code)
					assert.Equal(t, expectedContent, rr.Body.String())
				}
			})

			t.Run("upload without file", func(t *testing.T) {
				// Empty map means no files
				files := map[string]string{}
				rr := h.makeUploadRequest(t, baseURL+"/upload?file_path="+url.QueryEscape("test"), files, h.RegularTestUser)
				assert.Equal(t, http.StatusBadRequest, rr.Code)
			})

			t.Run("upload with missing file_path parameter", func(t *testing.T) {
				fileName := "test.txt"
				fileContent := "test content"
				files := map[string]string{fileName: fileContent}

				rr := h.makeUploadRequest(t, baseURL+"/upload", files, h.RegularTestUser)
				assert.Equal(t, http.StatusBadRequest, rr.Code)
			})

			t.Run("upload with invalid file_path", func(t *testing.T) {
				fileName := "test.txt"
				fileContent := "test content"
				invalidPath := "../../../etc/passwd"
				files := map[string]string{fileName: fileContent}

				rr := h.makeUploadRequest(t, baseURL+"/upload?file_path="+url.QueryEscape(invalidPath), files, h.RegularTestUser)
				assert.Equal(t, http.StatusBadRequest, rr.Code)
			})
		})
	})
}
