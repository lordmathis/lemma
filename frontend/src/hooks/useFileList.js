import { useState, useCallback } from 'react';
import { fetchFileList } from '../services/api';
import { useWorkspace } from '../contexts/WorkspaceContext';

export const useFileList = () => {
  const [files, setFiles] = useState([]);
  const { currentWorkspace } = useWorkspace();

  const loadFileList = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
      const fileList = await fetchFileList(currentWorkspace.id);
      if (Array.isArray(fileList)) {
        setFiles(fileList);
      } else {
        throw new Error('File list is not an array');
      }
    } catch (error) {
      console.error('Failed to load file list:', error);
    }
  }, [currentWorkspace]);

  return { files, loadFileList };
};
