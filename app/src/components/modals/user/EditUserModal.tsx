import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Select,
  Button,
  Group,
  PasswordInput,
  Text,
} from '@mantine/core';
import type { UpdateUserRequest } from '@/types/api';
import { type User, UserRole } from '@/types/models';

interface EditUserModalProps {
  opened: boolean;
  onClose: () => void;
  onEditUser: (userId: number, userData: UpdateUserRequest) => Promise<boolean>;
  loading: boolean;
  user: User | null;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  opened,
  onClose,
  onEditUser,
  loading,
  user,
}) => {
  const [formData, setFormData] = useState<UpdateUserRequest>({
    email: '',
    displayName: '',
    role: UserRole.Editor,
    password: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        displayName: user.displayName || '',
        role: user.role,
        password: '',
      });
    }
  }, [user]);

  const handleSubmit = async (): Promise<void> => {
    if (!user) return;

    const updateData = {
      ...formData,
      ...(formData.password ? { password: formData.password } : {}),
    };

    const success = await onEditUser(user.id, updateData);
    if (success) {
      setFormData({
        email: '',
        displayName: '',
        role: UserRole.Editor,
        password: '',
      });
      onClose();
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit User" centered>
      <Stack>
        <TextInput
          label="Email"
          required
          value={formData.email}
          data-testid="edit-user-email-input"
          onChange={(e) =>
            setFormData({ ...formData, email: e.currentTarget.value })
          }
          placeholder="user@example.com"
        />
        <TextInput
          label="Display Name"
          value={formData.displayName}
          data-testid="edit-user-display-name-input"
          onChange={(e) =>
            setFormData({ ...formData, displayName: e.currentTarget.value })
          }
          placeholder="John Doe"
        />
        <Select
          label="Role"
          required
          value={formData.role ? formData.role.toString() : null}
          data-testid="edit-user-role-select"
          onChange={(value) =>
            setFormData({ ...formData, role: value as UserRole })
          }
          data={[
            { value: UserRole.Admin, label: 'Admin' },
            { value: UserRole.Editor, label: 'Editor' },
            { value: UserRole.Viewer, label: 'Viewer' },
          ]}
        />
        <PasswordInput
          label="New Password"
          value={formData.password}
          data-testid="edit-user-password-input"
          onChange={(e) =>
            setFormData({ ...formData, password: e.currentTarget.value })
          }
          placeholder="Enter new password (leave empty to keep current)"
        />
        <Text size="xs" c="dimmed">
          Leave password empty to keep the current password
        </Text>
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={onClose}
            data-testid="cancel-edit-user-button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit}
            loading={loading}
            data-testid="confirm-edit-user-button"
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default EditUserModal;
