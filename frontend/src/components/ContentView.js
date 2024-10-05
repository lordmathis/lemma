import React from 'react';
import Editor from './Editor';
import MarkdownPreview from './MarkdownPreview';
import { Text } from '@geist-ui/core';
import { getFileUrl } from '../services/api';
import { isImageFile } from '../utils/fileHelpers';

const ContentView = ({
  activeTab,
  selectedFile,
  content,
  handleContentChange,
  handleSave,
  handleLinkClick,
}) => {
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

  console.log('ContentView content', content);

  return activeTab === 'source' ? (
    <Editor
      content={content}
      handleContentChange={handleContentChange}
      handleSave={handleSave}
      selectedFile={selectedFile}
    />
  ) : (
    <MarkdownPreview content={content} handleLinkClick={handleLinkClick} />
  );
};

export default ContentView;
