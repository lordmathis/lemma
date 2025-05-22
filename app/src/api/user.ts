import { API_BASE_URL, type UpdateProfileRequest } from '@/types/api';
import { isUser, type User } from '@/types/models';
import { apiCall } from './api';

/**
 * updateProfile updates the user's profile information.
 * @param updateRequest - The request object containing the updated profile information.
 * @returns A promise that resolves to the updated user object.
 * @throws An error if the response is not valid user data.
 */
export const updateProfile = async (
  updateRequest: UpdateProfileRequest
): Promise<User> => {
  const response = await apiCall(`${API_BASE_URL}/profile`, {
    method: 'PUT',
    body: JSON.stringify(updateRequest),
  });
  const data: unknown = response.json();

  if (!isUser(data)) {
    throw new Error('Invalid user data');
  }
  return data;
};

/**
 * deleteProfile deletes the user's profile.
 * @param password - The password of the user.
 * @throws An error if the response status is not 204 (No Content).
 */
export const deleteUser = async (password: string) => {
  const response = await apiCall(`${API_BASE_URL}/profile`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });

  if (response.status !== 204) {
    throw new Error('Failed to delete profile');
  }
  return;
};
