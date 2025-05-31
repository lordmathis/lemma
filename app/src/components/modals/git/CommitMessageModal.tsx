import React, { useState } from 'react';
import { Modal, TextInput, Button, Group, Box } from '@mantine/core';
import { useModalContext } from '../../../contexts/ModalContext';

interface CommitMessageModalProps {
  onCommitAndPush: (message: string) => Promise<void>;
}

const CommitMessageModal: React.FC<CommitMessageModalProps> = ({
  onCommitAndPush,
}) => {
  const [message, setMessage] = useState('');
  const { commitMessageModalVisible, setCommitMessageModalVisible } =
    useModalContext();

  const handleSubmit = async (): Promise<void> => {
    const commitMessage = message.trim();
    if (commitMessage) {
      await onCommitAndPush(commitMessage);
      setMessage('');
      setCommitMessageModalVisible(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
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
          type="text"
          label="Commit Message"
          data-testid="commit-message-input"
          placeholder="Enter commit message"
          value={message}
          onChange={(event) => setMessage(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          mb="md"
          w="100%"
        />
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => setCommitMessageModalVisible(false)}
            data-testid="cancel-commit-button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            data-testid="commit-button"
          >
            Commit
          </Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default CommitMessageModal;
