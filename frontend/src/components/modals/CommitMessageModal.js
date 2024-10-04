import React, { useState } from 'react';
import { Modal, Input } from '@geist-ui/core';
import { useGitOperationsContext } from '../../contexts/GitOperationsContext';
import { useUIStateContext } from '../../contexts/UIStateContext';

const CommitMessageModal = () => {
  const [message, setMessage] = useState('');
  const { handleCommitAndPush } = useGitOperationsContext();
  const { commitMessageModalVisible, setCommitMessageModalVisible } =
    useUIStateContext();

  const handleSubmit = async () => {
    if (message) {
      await handleCommitAndPush(message);
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
