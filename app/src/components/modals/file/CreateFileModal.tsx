import React, { useState } from 'react';
import { Modal, TextInput, Button, Group, Box, Popover, ActionIcon, Text } from '@mantine/core';
import { IconFolderOpen } from '@tabler/icons-react';
import { useModalContext } from '../../../contexts/ModalContext';
import { useFileList } from '../../../hooks/useFileList';
import { FolderSelector } from '../../files/FolderSelector';

interface CreateFileModalProps {
  onCreateFile: (fileName: string) => Promise<void>;
}

const CreateFileModal: React.FC<CreateFileModalProps> = ({ onCreateFile }) => {
  const [fileName, setFileName] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [popoverOpened, setPopoverOpened] = useState<boolean>(false);
  const { newFileModalVisible, setNewFileModalVisible } = useModalContext();
  const { files, loadFileList } = useFileList();

  const handleSubmit = async (): Promise<void> => {
    if (fileName) {
      const fullPath = selectedFolder
        ? `${selectedFolder}/${fileName.trim()}`
        : fileName.trim();
      await onCreateFile(fullPath);
      setFileName('');
      setSelectedFolder('');
      setNewFileModalVisible(false);
    }
  };

  const handleClose = () => {
    setFileName('');
    setSelectedFolder('');
    setNewFileModalVisible(false);
  };

  const handleFolderSelect = (path: string) => {
    setSelectedFolder(path);
    // Keep popover open so users can continue browsing
  };

  // Load files when modal opens
  React.useEffect(() => {
    if (newFileModalVisible) {
      void loadFileList();
    }
  }, [newFileModalVisible, loadFileList]);

  // Generate full path preview
  const fullPathPreview = selectedFolder
    ? `${selectedFolder}/${fileName || 'filename'}`
    : fileName || 'filename';

  // Display text for location input
  const locationDisplay = selectedFolder || '/ (root)';

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <Modal
      opened={newFileModalVisible}
      onClose={handleClose}
      title="Create New File"
      centered
      size="sm"
    >
      <Box maw={400} mx="auto">
        {/* Location input with folder picker */}
        <Popover
          opened={popoverOpened}
          onChange={setPopoverOpened}
          position="bottom-start"
          width="target"
        >
          <Popover.Target>
            <TextInput
              label="Location"
              type="text"
              placeholder="Select folder"
              data-testid="location-input"
              value={locationDisplay}
              readOnly
              mb="md"
              w="100%"
              rightSection={
                <ActionIcon
                  variant="subtle"
                  onClick={() => setPopoverOpened((o) => !o)}
                  data-testid="folder-picker-button"
                >
                  <IconFolderOpen size={18} />
                </ActionIcon>
              }
              styles={{
                input: {
                  cursor: 'pointer',
                },
              }}
              onClick={() => setPopoverOpened(true)}
            />
          </Popover.Target>
          <Popover.Dropdown>
            <FolderSelector
              files={files}
              selectedPath={selectedFolder}
              onSelect={handleFolderSelect}
            />
          </Popover.Dropdown>
        </Popover>

        {/* File name input */}
        <TextInput
          label="File Name"
          type="text"
          placeholder="example.md"
          data-testid="file-name-input"
          value={fileName}
          onChange={(event) => setFileName(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          mb="xs"
          w="100%"
        />

        {/* Hint text */}
        <Text size="xs" c="dimmed" mb="xs">
          Tip: Use / to create nested folders (e.g., folder/subfolder/file.md)
        </Text>

        {/* Full path preview */}
        <Text size="sm" c="dimmed" mb="md">
          Full path: {fullPathPreview}
        </Text>

        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={handleClose}
            data-testid="cancel-create-file-button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            data-testid="confirm-create-file-button"
            disabled={!fileName.trim()}
          >
            Create
          </Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default CreateFileModal;
