import React, { useState } from 'react';
import { Modal, TextInput, Button, Group, Box } from '@mantine/core';
import { useModalContext } from '../../../contexts/ModalContext';

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
      opened={commitMessageModalVisible}
      onClose={() => setCommitMessageModalVisible(false)}
      title="Enter Commit Message"
      centered
      size="sm"
    >
      <Box maw={400} mx="auto">
        <TextInput
          label="Commit Message"
          placeholder="Enter commit message"
          value={message}
          onChange={(event) => setMessage(event.currentTarget.value)}
          mb="md"
          w="100%"
        />
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => setCommitMessageModalVisible(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Commit</Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default CommitMessageModal;
