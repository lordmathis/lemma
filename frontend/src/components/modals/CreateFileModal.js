import React, { useState } from 'react';
import { Modal, TextInput, Button, Group, Box } from '@mantine/core';
import { useModalContext } from '../../contexts/ModalContext';

const CreateFileModal = ({ onCreateFile }) => {
  const [fileName, setFileName] = useState('');
  const { newFileModalVisible, setNewFileModalVisible } = useModalContext();

  const handleSubmit = async () => {
    if (fileName) {
      await onCreateFile(fileName);
      setFileName('');
      setNewFileModalVisible(false);
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
          placeholder="Enter file name"
          value={fileName}
          onChange={(event) => setFileName(event.currentTarget.value)}
          mb="md"
          w="100%"
        />
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => setNewFileModalVisible(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create</Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default CreateFileModal;
