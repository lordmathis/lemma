import React from 'react';
import { Modal, Text } from '@geist-ui/core';
import { useFileContentContext } from '../../contexts/FileContentContext';
import { useUIStateContext } from '../../contexts/UIStateContext';

const DeleteFileModal = () => {
  const { selectedFile, handleDeleteFile } = useFileContentContext();
  const { deleteFileModalVisible, setDeleteFileModalVisible } =
    useUIStateContext();

  const handleConfirm = async () => {
    await handleDeleteFile();
    setDeleteFileModalVisible(false);
  };

  return (
    <Modal
      visible={deleteFileModalVisible}
      onClose={() => setDeleteFileModalVisible(false)}
    >
      <Modal.Title>Delete File</Modal.Title>
      <Modal.Content>
        <Text>Are you sure you want to delete "{selectedFile}"?</Text>
      </Modal.Content>
      <Modal.Action passive onClick={() => setDeleteFileModalVisible(false)}>
        Cancel
      </Modal.Action>
      <Modal.Action onClick={handleConfirm}>Delete</Modal.Action>
    </Modal>
  );
};

export default DeleteFileModal;
