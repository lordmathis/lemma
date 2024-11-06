import React from 'react';
import { Modal, Text, Button, Group } from '@mantine/core';
import { useModalContext } from '../../../contexts/ModalContext';

const DeleteFileModal = ({ onDeleteFile, selectedFile }) => {
  const { deleteFileModalVisible, setDeleteFileModalVisible } =
    useModalContext();

  const handleConfirm = async () => {
    await onDeleteFile(selectedFile);
    setDeleteFileModalVisible(false);
  };

  return (
    <Modal
      opened={deleteFileModalVisible}
      onClose={() => setDeleteFileModalVisible(false)}
      title="Delete File"
      centered
    >
      <Text>Are you sure you want to delete "{selectedFile}"?</Text>
      <Group justify="flex-end" mt="xl">
        <Button
          variant="default"
          onClick={() => setDeleteFileModalVisible(false)}
        >
          Cancel
        </Button>
        <Button color="red" onClick={handleConfirm}>
          Delete
        </Button>
      </Group>
    </Modal>
  );
};

export default DeleteFileModal;
