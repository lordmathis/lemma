import React, { useState } from 'react';
import { Modal, TextInput, Button, Group, Box } from '@mantine/core';
import { useModalContext } from '../../../contexts/ModalContext';

interface CreateFileModalProps {
  onCreateFile: (fileName: string) => Promise<void>;
}

const CreateFileModal: React.FC<CreateFileModalProps> = ({ onCreateFile }) => {
  const [fileName, setFileName] = useState<string>('');
  const { newFileModalVisible, setNewFileModalVisible } = useModalContext();

  const handleSubmit = async (): Promise<void> => {
    if (fileName) {
      await onCreateFile(fileName.trim());
      setFileName('');
      setNewFileModalVisible(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <Modal
      opened={newFileModalVisible}
      onClose={() => setNewFileModalVisible(false)}
      title="Create New File"
      centered
      size="sm"
    >
      <Box maw={400} mx="auto">
        <TextInput
          label="File Name"
          type="text"
          placeholder="Enter file name"
          data-testid="file-name-input"
          value={fileName}
          onChange={(event) => setFileName(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          mb="md"
          w="100%"
        />
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => setNewFileModalVisible(false)}
            data-testid="cancel-create-button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            data-testid="confirm-create-button"
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
