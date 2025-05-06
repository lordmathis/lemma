import { API_BASE_URL } from '../utils/constants';
import { apiCall } from './auth';

export const pullChanges = async (workspaceName) => {
  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${workspaceName}/git/pull`,
    {
      method: 'POST',
    }
  );
  return response.json();
};

export const commitAndPush = async (workspaceName, message) => {
  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${workspaceName}/git/commit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    }
  );
  return response.json();
};

export const getFileUrl = (workspaceName, filePath) => {
  return `${API_BASE_URL}/workspaces/${workspaceName}/files/${filePath}`;
};
