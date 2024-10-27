import React, { useState } from 'react';
import { Box, Button, Title } from '@mantine/core';
import DeleteWorkspaceModal from '../modals/DeleteWorkspaceModal';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useModalContext } from '../../contexts/ModalContext';

const DangerZoneSettings = () => {
  const { currentWorkspace, workspaces, deleteCurrentWorkspace } =
    useWorkspace();
  const { setSettingsModalVisible } = useModalContext();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const handleDelete = async () => {
    await deleteCurrentWorkspace();
    setDeleteModalOpened(false);
    setSettingsModalVisible(false);
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
        disabled={workspaces.length <= 1}
        title={
          workspaces.length <= 1
            ? 'Cannot delete the last workspace'
            : 'Delete this workspace'
        }
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
