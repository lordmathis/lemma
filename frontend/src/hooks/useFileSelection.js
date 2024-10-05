import { useState, useCallback } from 'react';
import { DEFAULT_FILE } from '../utils/constants'; // Assuming you have this constant defined

export const useFileSelection = () => {
  const [selectedFile, setSelectedFile] = useState(DEFAULT_FILE.path);
  const [isNewFile, setIsNewFile] = useState(true);

  const handleFileSelect = useCallback(async (filePath) => {
    setSelectedFile(filePath);
    setIsNewFile(filePath === DEFAULT_FILE.path);
  }, []);

  return { selectedFile, isNewFile, handleFileSelect };
};
