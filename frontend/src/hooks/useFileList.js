import { useState, useEffect, useCallback } from 'react';
import { fetchFileList } from '../services/api';

export const useFileList = (gitEnabled) => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);

  const loadFileList = useCallback(async () => {
    try {
      const fileList = await fetchFileList();
      if (Array.isArray(fileList)) {
        setFiles(fileList);
      } else {
        throw new Error('File list is not an array');
      }
    } catch (error) {
      console.error('Failed to load file list:', error);
      setError('Failed to load file list. Please try again later.');
    }
  }, []);

  useEffect(() => {
    loadFileList();
  }, [loadFileList, gitEnabled]);

  return { files, error, loadFileList };
};
