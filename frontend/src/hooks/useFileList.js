import { useState, useEffect, useCallback } from 'react';
import { fetchFileList } from '../services/api';

export const useFileList = () => {
  const [files, setFiles] = useState([]);

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
    }
  }, []);

  return { files, loadFileList };
};
