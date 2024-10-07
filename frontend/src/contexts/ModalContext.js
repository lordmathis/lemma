import React, { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [newFileModalVisible, setNewFileModalVisible] = useState(false);
  const [deleteFileModalVisible, setDeleteFileModalVisible] = useState(false);
  const [commitMessageModalVisible, setCommitMessageModalVisible] =
    useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const value = {
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
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};

export const useModalContext = () => useContext(ModalContext);
