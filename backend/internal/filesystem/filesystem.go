package filesystem

import (
	"io/ioutil"
	"os"
	"path/filepath"
)

type FileSystem struct {
	RootDir string
}

func New(rootDir string) *FileSystem {
	return &FileSystem{RootDir: rootDir}
}

func (fs *FileSystem) ListFilesRecursively() ([]string, error) {
	var files []string

	err := filepath.Walk(fs.RootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			relPath, _ := filepath.Rel(fs.RootDir, path)
			files = append(files, relPath)
		}
		return nil
	})

	return files, err
}

func (fs *FileSystem) GetFileContent(filePath string) ([]byte, error) {
	fullPath := filepath.Join(fs.RootDir, filePath)
	return ioutil.ReadFile(fullPath)
}
