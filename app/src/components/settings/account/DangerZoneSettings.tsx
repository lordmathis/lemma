import React, { useState } from 'react';
import { Box, Button, Text } from '@mantine/core';
import DeleteAccountModal from '../../modals/account/DeleteAccountModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfileSettings } from '../../../hooks/useProfileSettings';

const DangerZoneSettings: React.FC = () => {
  const { logout } = useAuth();
  const { deleteAccount } = useProfileSettings();
  const [deleteModalOpened, setDeleteModalOpened] = useState<boolean>(false);

  const handleDelete = async (password: string): Promise<void> => {
    const success = await deleteAccount(password);
    if (success) {
      setDeleteModalOpened(false);
      await logout();
    }
  };

  return (
    <Box mb="md">
      <Text size="sm" mb="sm" c="dimmed">
        Once you delete your account, there is no going back. Please be certain.
      </Text>
      <Button
        color="red"
        variant="light"
        onClick={() => setDeleteModalOpened(true)}
        fullWidth
      >
        Delete Account
      </Button>

      <DeleteAccountModal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        onConfirm={handleDelete}
      />
    </Box>
  );
};

export default DangerZoneSettings;
