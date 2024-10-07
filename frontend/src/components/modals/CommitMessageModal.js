import React, { useState } from 'react';
import { Modal, Input } from '@geist-ui/core';
import { useModalContext } from '../../contexts/ModalContext';

const CommitMessageModal = ({ onCommitAndPush }) => {
  const [message, setMessage] = useState('');
  const { commitMessageModalVisible, setCommitMessageModalVisible } =
    useModalContext();

  const handleSubmit = async () => {
    if (message) {
      await onCommitAndPush(message);
      setMessage('');
      setCommitMessageModalVisible(false);
    }
  };

  return (
    <Modal
      visible={commitMessageModalVisible}
      onClose={() => setCommitMessageModalVisible(false)}
    >
      <Modal.Title>Enter Commit Message</Modal.Title>
      <Modal.Content>
        <Input
          width="100%"
          placeholder="Enter commit message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Modal.Content>
      <Modal.Action passive onClick={() => setCommitMessageModalVisible(false)}>
        Cancel
      </Modal.Action>
      <Modal.Action onClick={handleSubmit}>Commit</Modal.Action>
    </Modal>
  );
};

export default CommitMessageModal;
