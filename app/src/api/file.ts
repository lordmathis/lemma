import { isFileNode, type FileNode } from '@/types/models';
import { apiCall } from './api';
import {
  API_BASE_URL,
  isLookupResponse,
  isSaveFileResponse,
  type SaveFileResponse,
} from '@/types/api';

/**
 * listFiles fetches the list of files in a workspace
 * @param workspaceName - The name of the workspace
 * @returns {Promise<FileNode[]>} A promise that resolves to an array of FileNode objects
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const listFiles = async (workspaceName: string): Promise<FileNode[]> => {
  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(workspaceName)}/files`
  );
  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid files response received from API');
  }
  return data.map((file) => {
    if (!isFileNode(file)) {
      throw new Error('Invalid file object received from API');
    }
    return file;
  });
};

/**
 * lookupFileByName fetches the file paths that match the given filename in a workspace
 * @param workspaceName - The name of the workspace
 * @param filename - The name of the file to look up
 * @returns {Promise<string[]>} A promise that resolves to an array of file paths
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const lookupFileByName = async (
  workspaceName: string,
  filename: string
): Promise<string[]> => {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename provided for lookup');
  }

  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(
      workspaceName
    )}/files/lookup?filename=${encodeURIComponent(filename)}`
  );
  const data: unknown = await response.json();
  if (!isLookupResponse(data)) {
    throw new Error('Invalid lookup response received from API');
  }
  const lookupResponse = data;
  return lookupResponse.paths;
};

/**
 * getFileContent fetches the content of a file in a workspace
 * @param workspaceName - The name of the workspace
 * @param filePath - The path of the file to fetch
 * @returns {Promise<string>} A promise that resolves to the file content
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const getFileContent = async (
  workspaceName: string,
  filePath: string
): Promise<string> => {
  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(
      workspaceName
    )}/files/content?file_path=${encodeURIComponent(filePath)}`
  );
  return response.text();
};

/**
 * saveFile saves the content to a file in a workspace
 * @param workspaceName - The name of the workspace
 * @param filePath - The path of the file to save
 * @param content - The content to save in the file
 * @returns {Promise<SaveFileResponse>} A promise that resolves to the save file response
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const saveFile = async (
  workspaceName: string,
  filePath: string,
  content: string
): Promise<SaveFileResponse> => {
  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(
      workspaceName
    )}/files?file_path=${encodeURIComponent(filePath)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: content,
    }
  );
  const data: unknown = await response.json();
  if (!isSaveFileResponse(data)) {
    throw new Error('Invalid save file response received from API');
  }
  return data;
};

/**
 * deleteFile deletes a file in a workspace
 * @param workspaceName - The name of the workspace
 * @param filePath - The path of the file to delete
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const deleteFile = async (workspaceName: string, filePath: string) => {
  await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(
      workspaceName
    )}/files?file_path=${encodeURIComponent(filePath)}`,
    {
      method: 'DELETE',
    }
  );
};

/**
 * getLastOpenedFile fetches the last opened file in a workspace
 * @param workspaceName - The name of the workspace
 * @returns {Promise<string>} A promise that resolves to the last opened file path
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const getLastOpenedFile = async (
  workspaceName: string
): Promise<string> => {
  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(workspaceName)}/files/last`
  );
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('lastOpenedFilePath' in data)
  ) {
    throw new Error('Invalid last opened file response received from API');
  }
  return data.lastOpenedFilePath as string;
};

/**
 * updateLastOpenedFile updates the last opened file in a workspace
 * @param workspaceName - The name of the workspace
 * @param filePath - The path of the file to set as last opened
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const updateLastOpenedFile = async (
  workspaceName: string,
  filePath: string
) => {
  await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(
      workspaceName
    )}/files/last?file_path=${encodeURIComponent(filePath)}`,
    {
      method: 'PUT',
    }
  );
};

/**
 * moveFile moves a file to a new location in a workspace
 * @param workspaceName - The name of the workspace
 * @param srcPath - The source path of the file to move
 * @param destPath - The destination path for the file
 * @returns {Promise<SaveFileResponse>} A promise that resolves to the move file response
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const moveFile = async (
  workspaceName: string,
  srcPath: string,
  destPath: string
): Promise<SaveFileResponse> => {
  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(
      workspaceName
    )}/files/move?src_path=${encodeURIComponent(
      srcPath
    )}&dest_path=${encodeURIComponent(destPath)}`,
    {
      method: 'POST',
    }
  );
  const data: unknown = await response.json();
  if (!isSaveFileResponse(data)) {
    throw new Error('Invalid move file response received from API');
  }
  return data;
};

/**
 * uploadFile uploads multiple files to a workspace
 * @param workspaceName - The name of the workspace
 * @param directoryPath - The directory path where files should be uploaded
 * @param files - Multiple files to upload
 * @returns {Promise<SaveFileResponse>} A promise that resolves to the upload file response
 * @throws {Error} If the API call fails or returns an invalid response
 */
export const uploadFile = async (
  workspaceName: string,
  directoryPath: string,
  files: FileList
): Promise<SaveFileResponse> => {
  const formData = new FormData();

  // Add all files to the form data
  Array.from(files).forEach((file) => {
    formData.append('file', file);
  });

  const response = await apiCall(
    `${API_BASE_URL}/workspaces/${encodeURIComponent(
      workspaceName
    )}/files/upload?file_path=${encodeURIComponent(directoryPath)}`,
    {
      method: 'POST',
      body: formData,
    }
  );
  const data: unknown = await response.json();
  if (!isSaveFileResponse(data)) {
    throw new Error('Invalid upload file response received from API');
  }
  return data;
};
