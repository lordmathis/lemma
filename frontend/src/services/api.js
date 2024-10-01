const API_BASE_URL = window.API_BASE_URL;

const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `HTTP error! status: ${response.status}`
      );
    }
    return response;
  } catch (error) {
    console.error(`API call failed: ${error.message}`);
    throw error;
  }
};

export const fetchFileList = async () => {
  const response = await apiCall(`${API_BASE_URL}/files`);
  return response.json();
};

export const fetchFileContent = async (filePath) => {
  const response = await apiCall(`${API_BASE_URL}/files/${filePath}`);
  return response.text();
};

export const saveFileContent = async (filePath, content) => {
  const response = await apiCall(`${API_BASE_URL}/files/${filePath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: content,
  });
  return response.text();
};

export const deleteFile = async (filePath) => {
  const response = await apiCall(`${API_BASE_URL}/files/${filePath}`, {
    method: 'DELETE',
  });
  return response.text();
};

export const fetchUserSettings = async (userId) => {
  const response = await apiCall(`${API_BASE_URL}/settings?userId=${userId}`);
  return response.json();
};

export const saveUserSettings = async (settings) => {
  const response = await apiCall(`${API_BASE_URL}/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  return response.json();
};

export const pullChanges = async () => {
  const response = await apiCall(`${API_BASE_URL}/git/pull`, {
    method: 'POST',
  });
  return response.json();
};

export const commitAndPush = async (message) => {
  const response = await apiCall(`${API_BASE_URL}/git/commit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });
  return response.json();
};

export const getFileUrl = (filePath) => {
  return `${API_BASE_URL}/files/${filePath}`;
};

export const lookupFileByName = async (filename) => {
  const response = await apiCall(
    `${API_BASE_URL}/files/lookup?filename=${encodeURIComponent(filename)}`
  );
  const data = await response.json();
  return data.paths;
};
