package storage_test

import (
	"io/fs"
	"novamd/internal/storage"
	"path/filepath"
	"testing"
)

// TestFileNode ensures FileNode structs are created correctly
func TestFileNode(t *testing.T) {
	testCases := []struct {
		name string // name of the test case
		node storage.FileNode
		want storage.FileNode
	}{
		{
			name: "file without children",
			node: storage.FileNode{
				ID:   "test.md",
				Name: "test.md",
				Path: "test.md",
			},
			want: storage.FileNode{
				ID:   "test.md",
				Name: "test.md",
				Path: "test.md",
			},
		},
		{
			name: "directory with children",
			node: storage.FileNode{
				ID:   "dir",
				Name: "dir",
				Path: "dir",
				Children: []storage.FileNode{
					{
						ID:   "dir/file1.md",
						Name: "file1.md",
						Path: "dir/file1.md",
					},
				},
			},
			want: storage.FileNode{
				ID:   "dir",
				Name: "dir",
				Path: "dir",
				Children: []storage.FileNode{
					{
						ID:   "dir/file1.md",
						Name: "file1.md",
						Path: "dir/file1.md",
					},
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			got := tc.node // Now we're testing the actual node structure

			if got.ID != tc.want.ID {
				t.Errorf("ID = %v, want %v", got.ID, tc.want.ID)
			}
			if got.Name != tc.want.Name {
				t.Errorf("Name = %v, want %v", got.Name, tc.want.Name)
			}
			if got.Path != tc.want.Path {
				t.Errorf("Path = %v, want %v", got.Path, tc.want.Path)
			}
			if len(got.Children) != len(tc.want.Children) {
				t.Errorf("len(Children) = %v, want %v", len(got.Children), len(tc.want.Children))
			}
			// Add deep comparison of children if they exist
			if len(got.Children) > 0 {
				for i := range got.Children {
					if got.Children[i].ID != tc.want.Children[i].ID {
						t.Errorf("Children[%d].ID = %v, want %v", i, got.Children[i].ID, tc.want.Children[i].ID)
					}
					if got.Children[i].Name != tc.want.Children[i].Name {
						t.Errorf("Children[%d].Name = %v, want %v", i, got.Children[i].Name, tc.want.Children[i].Name)
					}
					if got.Children[i].Path != tc.want.Children[i].Path {
						t.Errorf("Children[%d].Path = %v, want %v", i, got.Children[i].Path, tc.want.Children[i].Path)
					}
				}
			}
		})
	}
}

func TestListFilesRecursively(t *testing.T) {
	mockFS := NewMockFS()
	s := storage.NewServiceWithOptions("test-root", storage.Options{
		Fs:           mockFS,
		NewGitClient: nil,
	})

	t.Run("empty directory", func(t *testing.T) {
		mockFS.ReadDirReturns = map[string]struct {
			entries []fs.DirEntry
			err     error
		}{
			"test-root/1/1": {
				entries: []fs.DirEntry{},
				err:     nil,
			},
		}

		files, err := s.ListFilesRecursively(1, 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(files) != 0 {
			t.Errorf("expected empty file list, got %v", files)
		}
	})

	t.Run("directory with files", func(t *testing.T) {
		mockFS.ReadDirReturns = map[string]struct {
			entries []fs.DirEntry
			err     error
		}{
			"test-root/1/1": {
				entries: []fs.DirEntry{
					NewMockDirEntry("file1.md", false),
					NewMockDirEntry("file2.md", false),
				},
				err: nil,
			},
		}

		files, err := s.ListFilesRecursively(1, 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(files) != 2 {
			t.Errorf("expected 2 files, got %d", len(files))
		}
	})

	t.Run("nested directories", func(t *testing.T) {
		mockFS.ReadDirReturns = map[string]struct {
			entries []fs.DirEntry
			err     error
		}{
			"test-root/1/1": {
				entries: []fs.DirEntry{
					NewMockDirEntry("dir1", true),
					NewMockDirEntry("file1.md", false),
				},
				err: nil,
			},
			"test-root/1/1/dir1": {
				entries: []fs.DirEntry{
					NewMockDirEntry("file2.md", false),
				},
				err: nil,
			},
		}

		files, err := s.ListFilesRecursively(1, 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(files) != 2 { // dir1 and file1.md
			t.Errorf("expected 2 entries at root, got %d", len(files))
		}

		// Find directory and check its children
		var dirFound bool
		for _, f := range files {
			if f.Name == "dir1" {
				dirFound = true
				if len(f.Children) != 1 {
					t.Errorf("expected 1 child in dir1, got %d", len(f.Children))
				}
			}
		}
		if !dirFound {
			t.Error("directory 'dir1' not found in results")
		}
	})
}

func TestGetFileContent(t *testing.T) {
	mockFS := NewMockFS()
	s := storage.NewServiceWithOptions("test-root", storage.Options{
		Fs:           mockFS,
		NewGitClient: nil,
	})

	testCases := []struct {
		name        string
		userID      int
		workspaceID int
		filePath    string
		mockData    []byte
		mockErr     error
		wantErr     bool
	}{
		{
			name:        "successful read",
			userID:      1,
			workspaceID: 1,
			filePath:    "test.md",
			mockData:    []byte("test content"),
			mockErr:     nil,
			wantErr:     false,
		},
		{
			name:        "file not found",
			userID:      1,
			workspaceID: 1,
			filePath:    "nonexistent.md",
			mockData:    nil,
			mockErr:     fs.ErrNotExist,
			wantErr:     true,
		},
		{
			name:        "invalid path",
			userID:      1,
			workspaceID: 1,
			filePath:    "../../../etc/passwd",
			mockData:    nil,
			mockErr:     nil,
			wantErr:     true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			expectedPath := filepath.Join("test-root", "1", "1", tc.filePath)
			mockFS.ReadFileReturns[expectedPath] = struct {
				data []byte
				err  error
			}{tc.mockData, tc.mockErr}

			content, err := s.GetFileContent(tc.userID, tc.workspaceID, tc.filePath)

			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if string(content) != string(tc.mockData) {
				t.Errorf("content = %q, want %q", content, tc.mockData)
			}

			if mockFS.ReadCalls[expectedPath] != 1 {
				t.Errorf("expected 1 read call for %s, got %d", expectedPath, mockFS.ReadCalls[expectedPath])
			}
		})
	}
}

func TestSaveFile(t *testing.T) {
	mockFS := NewMockFS()
	s := storage.NewServiceWithOptions("test-root", storage.Options{
		Fs:           mockFS,
		NewGitClient: nil,
	})

	testCases := []struct {
		name        string
		userID      int
		workspaceID int
		filePath    string
		content     []byte
		mockErr     error
		wantErr     bool
	}{
		{
			name:        "successful save",
			userID:      1,
			workspaceID: 1,
			filePath:    "test.md",
			content:     []byte("test content"),
			mockErr:     nil,
			wantErr:     false,
		},
		{
			name:        "invalid path",
			userID:      1,
			workspaceID: 1,
			filePath:    "../../../etc/passwd",
			content:     []byte("test content"),
			mockErr:     nil,
			wantErr:     true,
		},
		{
			name:        "write error",
			userID:      1,
			workspaceID: 1,
			filePath:    "test.md",
			content:     []byte("test content"),
			mockErr:     fs.ErrPermission,
			wantErr:     true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockFS.WriteFileError = tc.mockErr
			err := s.SaveFile(tc.userID, tc.workspaceID, tc.filePath, tc.content)

			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			expectedPath := filepath.Join("test-root", "1", "1", tc.filePath)
			if content, ok := mockFS.WriteCalls[expectedPath]; ok {
				if string(content) != string(tc.content) {
					t.Errorf("written content = %q, want %q", content, tc.content)
				}
			} else {
				t.Error("expected write call not made")
			}
		})
	}
}

func TestDeleteFile(t *testing.T) {
	mockFS := NewMockFS()
	s := storage.NewServiceWithOptions("test-root", storage.Options{
		Fs:           mockFS,
		NewGitClient: nil,
	})

	testCases := []struct {
		name        string
		userID      int
		workspaceID int
		filePath    string
		mockErr     error
		wantErr     bool
	}{
		{
			name:        "successful delete",
			userID:      1,
			workspaceID: 1,
			filePath:    "test.md",
			mockErr:     nil,
			wantErr:     false,
		},
		{
			name:        "invalid path",
			userID:      1,
			workspaceID: 1,
			filePath:    "../../../etc/passwd",
			mockErr:     nil,
			wantErr:     true,
		},
		{
			name:        "file not found",
			userID:      1,
			workspaceID: 1,
			filePath:    "nonexistent.md",
			mockErr:     fs.ErrNotExist,
			wantErr:     true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockFS.RemoveError = tc.mockErr
			err := s.DeleteFile(tc.userID, tc.workspaceID, tc.filePath)

			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			expectedPath := filepath.Join("test-root", "1", "1", tc.filePath)
			found := false
			for _, p := range mockFS.RemoveCalls {
				if p == expectedPath {
					found = true
					break
				}
			}
			if !found {
				t.Error("expected delete call not made")
			}
		})
	}
}
