const API_BASE_URL = window.API_BASE_URL;

export const fetchFileList = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/files`);
    if (!response.ok) {
      throw new Error('Failed to fetch file list');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching file list:', error);
    throw error;
  }
};

export const fetchFileContent = async (filePath) => {
  try {
    const response = await fetch(`${API_BASE_URL}/files/${filePath}`);
    if (!response.ok) {
      throw new Error('Failed to fetch file content');
    }
    return await response.text();
  } catch (error) {
    console.error('Error fetching file content:', error);
    throw error;
  }
};

export const saveFileContent = async (filePath, content) => {
  const response = await fetch(`${API_BASE_URL}/files/${filePath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: content,
  });

  if (!response.ok) {
    throw new Error('Failed to save file');
  }

  return await response.text();
};

export const deleteFile = async (filePath) => {
  try {
    const response = await fetch(`${API_BASE_URL}/files/${filePath}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
    return await response.text();
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

export const fetchUserSettings = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/settings?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user settings');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user settings:', error);
    throw error;
  }
};

export const saveUserSettings = async (settings) => {
  try {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving user settings:', error);
    throw error;
  }
};

export const pullChanges = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/git/pull`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to pull changes');
    }
    return await response.json();
  } catch (error) {
    console.error('Error pulling changes:', error);
    throw error;
  }
};

export const commitAndPush = async (message) => {
  try {
    const response = await fetch(`${API_BASE_URL}/git/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      throw new Error('Failed to commit and push changes');
    }
    return await response.json();
  } catch (error) {
    console.error('Error committing and pushing changes:', error);
    throw error;
  }
};

export const getFileUrl = (filePath) => {
  return `${API_BASE_URL}/files/${filePath}`;
};
