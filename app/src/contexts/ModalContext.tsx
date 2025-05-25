import React, {
  type ReactNode,
  createContext,
  useContext,
  useState,
} from 'react';

interface ModalContextType {
  newFileModalVisible: boolean;
  setNewFileModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  deleteFileModalVisible: boolean;
  setDeleteFileModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  commitMessageModalVisible: boolean;
  setCommitMessageModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  settingsModalVisible: boolean;
  setSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  switchWorkspaceModalVisible: boolean;
  setSwitchWorkspaceModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  createWorkspaceModalVisible: boolean;
  setCreateWorkspaceModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

// Create the context with a default undefined value
const ModalContext = createContext<ModalContextType | null>(null);

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [newFileModalVisible, setNewFileModalVisible] = useState(false);
  const [deleteFileModalVisible, setDeleteFileModalVisible] = useState(false);
  const [commitMessageModalVisible, setCommitMessageModalVisible] =
    useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [switchWorkspaceModalVisible, setSwitchWorkspaceModalVisible] =
    useState(false);
  const [createWorkspaceModalVisible, setCreateWorkspaceModalVisible] =
    useState(false);

  const value: ModalContextType = {
    newFileModalVisible,
    setNewFileModalVisible,
    deleteFileModalVisible,
    setDeleteFileModalVisible,
    commitMessageModalVisible,
    setCommitMessageModalVisible,
    settingsModalVisible,
    setSettingsModalVisible,
    switchWorkspaceModalVisible,
    setSwitchWorkspaceModalVisible,
    createWorkspaceModalVisible,
    setCreateWorkspaceModalVisible,
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};

export const useModalContext = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (context === null) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }
  return context;
};
