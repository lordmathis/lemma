import React from 'react';
import { Modal, Text, Button, Group } from '@mantine/core';
import { useModalContext } from '../../../contexts/ModalContext';

interface DeleteFileModalProps {
  onDeleteFile: (fileName: string) => Promise<void>;
  selectedFile: string | null;
}

const DeleteFileModal: React.FC<DeleteFileModalProps> = ({
  onDeleteFile,
  selectedFile,
}) => {
  const { deleteFileModalVisible, setDeleteFileModalVisible } =
    useModalContext();

  const handleConfirm = async (): Promise<void> => {
    if (!selectedFile) return;

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
      <Text>Are you sure you want to delete &quot;{selectedFile}&quot;?</Text>
      <Group justify="flex-end" mt="xl">
        <Button
          variant="default"
          onClick={() => setDeleteFileModalVisible(false)}
        >
          Cancel
        </Button>
        <Button color="red" onClick={() => void handleConfirm()}>
          Delete
        </Button>
      </Group>
    </Modal>
  );
};

export default DeleteFileModal;
