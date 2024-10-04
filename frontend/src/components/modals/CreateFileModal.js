import React, { useState } from 'react';
import { Modal, Input } from '@geist-ui/core';
import { useFileOperations } from '../../contexts/FileOperationsContext';
import { useModalContext } from '../../contexts/ModalContext';

const CreateFileModal = () => {
  const [fileName, setFileName] = useState('');
  const { newFileModalVisible, setNewFileModalVisible } = useModalContext();
  const { handleCreateNewFile } = useFileOperations();

  const handleSubmit = async () => {
    if (fileName) {
      await handleCreateNewFile(fileName);
      setFileName('');
      setNewFileModalVisible(false);
    }
  };

  return (
    <Modal
      visible={newFileModalVisible}
      onClose={() => setNewFileModalVisible(false)}
    >
      <Modal.Title>Create New File</Modal.Title>
      <Modal.Content>
        <Input
          width="100%"
          placeholder="Enter file name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
      </Modal.Content>
      <Modal.Action passive onClick={() => setNewFileModalVisible(false)}>
        Cancel
      </Modal.Action>
      <Modal.Action onClick={handleSubmit}>Create</Modal.Action>
    </Modal>
  );
};

export default CreateFileModal;
