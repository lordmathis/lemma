import React from 'react';
import { Modal, Text } from '@geist-ui/core';
import { useModalContext } from '../../contexts/ModalContext';
import { useFileSelection } from '../../contexts/FileSelectionContext';

const DeleteFileModal = () => {
  const { selectedFile, handleDeleteFile } = useFileSelection();
  const { deleteFileModalVisible, setDeleteFileModalVisible } =
    useModalContext();

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
