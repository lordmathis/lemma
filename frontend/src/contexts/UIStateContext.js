import React, { createContext, useContext, useState } from 'react';

const UIStateContext = createContext();

export const UIStateProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('source');
  const [newFileModalVisible, setNewFileModalVisible] = useState(false);
  const [deleteFileModalVisible, setDeleteFileModalVisible] = useState(false);
  const [commitMessageModalVisible, setCommitMessageModalVisible] =
    useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const value = {
    activeTab,
    setActiveTab,
    newFileModalVisible,
    setNewFileModalVisible,
    deleteFileModalVisible,
    setDeleteFileModalVisible,
    commitMessageModalVisible,
    setCommitMessageModalVisible,
    settingsModalVisible,
    setSettingsModalVisible,
  };

  return (
    <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>
  );
};

export const useUIStateContext = () => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIStateContext must be used within a UIStateProvider');
  }
  return context;
};
