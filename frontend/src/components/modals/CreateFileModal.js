import React from 'react';
import { Modal, Input } from '@geist-ui/core';

const CreateFileModal = ({
  visible,
  onClose,
  onSubmit,
  fileName,
  setFileName,
}) => {
  return (
    <Modal visible={visible} onClose={onClose}>
      <Modal.Title>Create New File</Modal.Title>
      <Modal.Content>
        <Input
          width="100%"
          placeholder="Enter file name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
      </Modal.Content>
      <Modal.Action passive onClick={onClose}>
        Cancel
      </Modal.Action>
      <Modal.Action onClick={onSubmit}>Create</Modal.Action>
    </Modal>
  );
};

export default CreateFileModal;
