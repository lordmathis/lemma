// Package storage_test provides tests for the storage package.
package storage_test

import (
	"novamd/internal/storage"
	"novamd/internal/testutils"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListFilesRecursively(t *testing.T) {
	tests := []testutils.TestCase{
		{
			Name: "empty workspace returns empty list",
			Setup: func(t *testing.T, fixtures any) {
				fs := fixtures.(*MapFS)
				require.NoError(t, fs.MkdirAll("/test/root/1/1", 0755))
			},
			Fixtures: NewMapFS(),
			Validate: func(t *testing.T, result any, err error) {
				require.NoError(t, err)
				files := result.([]storage.FileNode)
				assert.Empty(t, files)
			},
		},
		{
			Name: "lists files and directories correctly",
			Setup: func(t *testing.T, fixtures any) {
				fs := fixtures.(*MapFS)
				err := fs.WriteFile("/test/root/1/1/file1.md", []byte("content1"), 0644)
				require.NoError(t, err, "Failed to write file1.md")

				err = fs.WriteFile("/test/root/1/1/dir/file2.md", []byte("content2"), 0644)
				require.NoError(t, err, "Failed to write file2.md")
			},
			Fixtures: NewMapFS(),
			Validate: func(t *testing.T, result any, err error) {
				require.NoError(t, err)
				files := result.([]storage.FileNode)
				require.Len(t, files, 2)
				assert.Equal(t, "dir", files[0].Name)
				assert.Equal(t, "file1.md", files[1].Name)
				assert.Len(t, files[0].Children, 1)
				assert.Equal(t, "file2.md", files[0].Children[0].Name)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.Name, func(t *testing.T) {
			fs := tc.Fixtures.(*MapFS)
			srv := storage.NewServiceWithFS("/test/root", fs)
			tc.Setup(t, tc.Fixtures)
			files, err := srv.ListFilesRecursively(1, 1)
			tc.Validate(t, files, err)
		})
	}
}
