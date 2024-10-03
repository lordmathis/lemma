import React from 'react';
import { Modal, Text } from '@geist-ui/core';

const DeleteFileModal = ({ visible, onClose, onConfirm, fileName }) => {
  return (
    <Modal visible={visible} onClose={onClose}>
      <Modal.Title>Delete File</Modal.Title>
      <Modal.Content>
        <Text>Are you sure you want to delete "{fileName}"?</Text>
      </Modal.Content>
      <Modal.Action passive onClick={onClose}>
        Cancel
      </Modal.Action>
      <Modal.Action onClick={onConfirm}>Delete</Modal.Action>
    </Modal>
  );
};

export default DeleteFileModal;
