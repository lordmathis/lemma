import { useFileList } from './useFileList';
import { useFileContent } from './useFileContent';
import { useGitOperations } from './useGitOperations';

export const useFileManagement = (gitEnabled) => {
  const { files, error: fileListError, loadFileList } = useFileList(gitEnabled);
  const {
    content,
    selectedFile,
    isNewFile,
    hasUnsavedChanges,
    error: fileContentError,
    handleFileSelect,
    handleContentChange,
    handleSave,
  } = useFileContent();
  const { pullLatestChanges, handleCommitAndPush } =
    useGitOperations(gitEnabled);

  return {
    files,
    content,
    selectedFile,
    isNewFile,
    hasUnsavedChanges,
    error: fileListError || fileContentError,
    handleFileSelect,
    handleContentChange,
    handleSave,
    pullLatestChanges,
    handleCommitAndPush,
    loadFileList,
  };
};
