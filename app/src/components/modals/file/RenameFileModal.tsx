import React, { useState, useEffect } from 'react';
import { Modal, TextInput, Button, Group, Box } from '@mantine/core';
import { useModalContext } from '../../../contexts/ModalContext';

interface RenameFileModalProps {
  onRenameFile: (oldPath: string, newPath: string) => Promise<void>;
  selectedFile: string | null;
}

const RenameFileModal: React.FC<RenameFileModalProps> = ({
  onRenameFile,
  selectedFile,
}) => {
  const [newFileName, setNewFileName] = useState<string>('');
  const { renameFileModalVisible, setRenameFileModalVisible } =
    useModalContext();

  // Extract just the filename from the full path for editing
  const getCurrentFileName = (filePath: string | null): string => {
    if (!filePath) return '';
    const parts = filePath.split('/');
    return parts[parts.length - 1] || '';
  };

  // Get the directory path (everything except the filename)
  const getDirectoryPath = (filePath: string | null): string => {
    if (!filePath) return '';
    const parts = filePath.split('/');
    return parts.slice(0, -1).join('/');
  };

  // Set the current filename when modal opens or selectedFile changes
  useEffect(() => {
    if (renameFileModalVisible && selectedFile) {
      setNewFileName(getCurrentFileName(selectedFile));
    }
  }, [renameFileModalVisible, selectedFile]);

  const handleSubmit = async (): Promise<void> => {
    if (newFileName && selectedFile) {
      const directoryPath = getDirectoryPath(selectedFile);
      const newPath = directoryPath
        ? `${directoryPath}/${newFileName.trim()}`
        : newFileName.trim();

      await onRenameFile(selectedFile, newPath);
      setNewFileName('');
      setRenameFileModalVisible(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const handleClose = (): void => {
    setNewFileName('');
    setRenameFileModalVisible(false);
  };

  return (
    <Modal
      opened={renameFileModalVisible}
      onClose={handleClose}
      title="Rename File"
      centered
      size="sm"
    >
      <Box maw={400} mx="auto">
        <TextInput
          label="File Name"
          type="text"
          placeholder="Enter new file name"
          data-testid="rename-file-input"
          value={newFileName}
          onChange={(event) => setNewFileName(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          mb="md"
          w="100%"
          autoFocus
        />
        <Group justify="flex-end" mt="xl">
          <Button
            variant="default"
            onClick={handleClose}
            data-testid="cancel-rename-file-button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            data-testid="confirm-rename-file-button"
            disabled={
              !newFileName.trim() ||
              newFileName.trim() === getCurrentFileName(selectedFile)
            }
          >
            Rename
          </Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default RenameFileModal;
