import { useState, useCallback } from 'react';
import { listFiles } from '../api/file';
import { useWorkspaceData } from '../contexts/WorkspaceDataContext';
import type { FileNode } from '@/types/models';

interface UseFileListResult {
  files: FileNode[];
  loadFileList: () => Promise<void>;
}

export const useFileList = (): UseFileListResult => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const { currentWorkspace, loading: workspaceLoading } = useWorkspaceData();

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
