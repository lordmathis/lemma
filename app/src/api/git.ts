import { API_BASE_URL } from '@/types/authApi';
import { apiCall } from './api';

/**
 * pullChanges fetches the latest changes from the remote repository
 * @param workspaceName - The name of the workspace
 * @returns {Promise<string>} A promise that resolves to a message indicating the result of the pull operation
 */
export const pullChanges = async (workspaceName: string): Promise<string> => {
  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(workspaceName)}/git/pull`,
    {
      method: 'POST',
    }
  );
  const data = await response.json();
  if (!('message' in data)) {
    throw new Error('Invalid pull response received from API');
  }
  return data.message;
};

/**
 * pushChanges pushes the local changes to the remote repository
 * @param workspaceName - The name of the workspace
 * @returns {Promise<CommitHash>} A promise that resolves to the commit hash of the pushed changes
 */
export const commitAndPush = async (
  workspaceName: string,
  message: string
): Promise<CommitHash> => {
  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(
      workspaceName
    )}/git/commit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    }
  );
  const data = await response.json();
  if (!('commitHash' in data)) {
    throw new Error('Invalid commit response received from API');
  }
  return data.commitHash as CommitHash;
};
