import { API_BASE_URL } from '@/types/authApi';
import { apiCall } from './api';
import { isWorkspace, Workspace } from '@/types/workspace';

/**
 * listWorkspaces fetches the list of workspaces
 * @returns {Promise<Workspace[]>} A promise that resolves to an array of Workspace objects
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const listWorkspaces = async (): Promise<Workspace[]> => {
  const response = await apiCall(`${API_BASE_URL}/workspaces`);
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid workspaces response received from API');
  }
  return data.map((workspace) => {
    if (!isWorkspace(workspace)) {
      throw new Error('Invalid workspace object received from API');
    }
    return workspace as Workspace;
  });
};

/**
 * createWorkspace creates a new workspace with the given name
 * @param name - The name of the workspace to create
 * @returns {Promise<Workspace>} A promise that resolves to the created Workspace object
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const createWorkspace = async (name: string): Promise<Workspace> => {
  const response = await apiCall(`${API_BASE_URL}/workspaces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  const data = await response.json();
  if (!isWorkspace(data)) {
    throw new Error('Invalid workspace object received from API');
  }
  return data as Workspace;
};

/**
 * getWorkspace fetches the workspace with the given name
 * @param workspaceName - The name of the workspace to fetch
 * @returns {Promise<Workspace>} A promise that resolves to the Workspace object
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const getWorkspace = async (
  workspaceName: string
): Promise<Workspace> => {
  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(workspaceName)}`
  );
  const data = response.json();
  if (!isWorkspace(data)) {
    throw new Error('Invalid workspace object received from API');
  }
  return data as Workspace;
};

/**
 * updateWorkspace updates the workspace with the given name
 * @param workspaceName - The name of the workspace to update
 * @param workspaceData - The updated Workspace object
 * @returns {Promise<Workspace>} A promise that resolves to the updated Workspace object
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const updateWorkspace = async (
  workspaceName: string,
  workspaceData: Workspace
): Promise<Workspace> => {
  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(workspaceName)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workspaceData),
    }
  );
  const data = response.json();
  if (!isWorkspace(data)) {
    throw new Error('Invalid workspace object received from API');
  }
  return data as Workspace;
};

/**
 * deleteWorkspace deletes the workspace with the given name
 * @param workspaceName - The name of the workspace to delete
 * @returns {Promise<string>} A promise that resolves to the next workspace name to switch to
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const deleteWorkspace = async (
  workspaceName: string
): Promise<string> => {
  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(workspaceName)}`,
    {
      method: 'DELETE',
    }
  );
  const data = await response.json();
  if (!('nextWorkspaceName' in data)) {
    throw new Error('Invalid delete workspace response received from API');
  }
  return data.nextWorkspaceName as string;
};

/**
 * getLastWorkspaceName fetches the last workspace name
 * @returns {Promise<string>} A promise that resolves to the last workspace name
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const getLastWorkspaceName = async (): Promise<string> => {
  const response = await apiCall(`${API_BASE_URL}/workspaces/last`);
  const data = await response.json();
  if (!('lastWorkspaceName' in data)) {
    throw new Error('Invalid last workspace name response received from API');
  }
  return data.lastWorkspaceName as string;
};

/**
 * updateLastWorkspaceName updates the last workspace name
 * @param workspaceName - The name of the workspace to set as last
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const updateLastWorkspaceName = async (workspaceName: string) => {
  const response = await apiCall(`${API_BASE_URL}/workspaces/last`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workspaceName }),
  });
  if (response.status !== 204) {
    throw new Error('Failed to update last workspace name');
  }
  return;
};
