import React, { useState } from 'react';
import { Box, Button, Title } from '@mantine/core';
import DeleteWorkspaceModal from '../modals/DeleteWorkspaceModal';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const DangerZoneSettings = () => {
  const { currentWorkspace } = useWorkspace();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const handleDelete = () => {
    // TODO: Implement delete functionality
    setDeleteModalOpened(false);
  };

  return (
    <Box mb="md">
      <Title order={3} mb="md">
        Danger Zone
      </Title>

      <Button
        color="red"
        variant="light"
        onClick={() => setDeleteModalOpened(true)}
        fullWidth
      >
        Delete Workspace
      </Button>

      <DeleteWorkspaceModal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        onConfirm={handleDelete}
        workspaceName={currentWorkspace?.name}
      />
    </Box>
  );
};

export default DangerZoneSettings;
