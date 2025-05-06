import { useState, useCallback } from 'react';
import { fetchFileList } from '../api/git';
import { useWorkspace } from '../contexts/WorkspaceContext';

export const useFileList = () => {
  const [files, setFiles] = useState([]);
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();

  const loadFileList = useCallback(async () => {
    if (!currentWorkspace || workspaceLoading) return;

    try {
      const fileList = await fetchFileList(currentWorkspace.name);
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
