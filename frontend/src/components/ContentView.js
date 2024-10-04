import React from 'react';
import Editor from './Editor';
import MarkdownPreview from './MarkdownPreview';
import { Text } from '@geist-ui/core';
import { getFileUrl, lookupFileByName } from '../services/api';
import { isImageFile } from '../utils/fileHelpers';
import { useFileContentContext } from '../contexts/FileContentContext';
import { useUIStateContext } from '../contexts/UIStateContext';
import { useSettings } from '../contexts/SettingsContext';
import { useFileNavigation } from '../hooks/useFileNavigation';

const ContentView = () => {
  const { content, selectedFile, handleContentChange, handleSave } =
    useFileContentContext();
  const { activeTab } = useUIStateContext();
  const { settings } = useSettings();
  const { handleLinkClick } = useFileNavigation();

  if (!selectedFile) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Text h3>No file selected.</Text>
      </div>
    );
  }

  if (isImageFile(selectedFile)) {
    return (
      <div className="image-preview">
        <img
          src={getFileUrl(selectedFile)}
          alt={selectedFile}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
    );
  }

  return activeTab === 'source' ? (
    <Editor
      content={content}
      onChange={handleContentChange}
      onSave={handleSave}
      filePath={selectedFile}
      themeType={settings.theme}
    />
  ) : (
    <MarkdownPreview
      content={content}
      baseUrl={window.API_BASE_URL}
      onLinkClick={handleLinkClick}
      lookupFileByName={lookupFileByName}
    />
  );
};

export default ContentView;
