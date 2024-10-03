import React, { useState } from 'react';
import { Modal, Input } from '@geist-ui/core';

const CommitMessageModal = ({ visible, onClose, onSubmit }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    onSubmit(message);
    setMessage('');
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <Modal.Title>Enter Commit Message</Modal.Title>
      <Modal.Content>
        <Input
          width="100%"
          placeholder="Enter commit message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Modal.Content>
      <Modal.Action passive onClick={onClose}>
        Cancel
      </Modal.Action>
      <Modal.Action onClick={handleSubmit}>Commit</Modal.Action>
    </Modal>
  );
};

export default CommitMessageModal;
