import { useState, useCallback } from 'react';
import { listFiles } from '../api/file';
import { useWorkspace } from '../contexts/WorkspaceContext';
import type { FileNode } from '../types/fileApi';

interface UseFileListResult {
  files: FileNode[];
  loadFileList: () => Promise<void>;
}

export const useFileList = (): UseFileListResult => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();

  const loadFileList = useCallback(async (): Promise<void> => {
    if (!currentWorkspace || workspaceLoading) return;

    try {
      const fileList = await listFiles(currentWorkspace.name);
      if (Array.isArray(fileList)) {
        setFiles(fileList);
      } else {
        throw new Error('File list is not an array');
      }
    } catch (error) {
      console.error('Failed to load file list:', error);
      setFiles([]);
    }
  }, [currentWorkspace, workspaceLoading]);

  return { files, loadFileList };
};
