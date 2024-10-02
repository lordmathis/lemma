import React from 'react';
import Editor from './Editor';
import MarkdownPreview from './MarkdownPreview';
import { getFileUrl } from '../services/api';
import { isImageFile } from '../utils/fileHelpers';

const ContentView = ({
  activeTab,
  content,
  selectedFile,
  onContentChange,
  onSave,
  themeType,
  onLinkClick,
  lookupFileByName,
}) => {
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
      onChange={onContentChange}
      onSave={onSave}
      filePath={selectedFile}
      themeType={themeType}
    />
  ) : (
    <MarkdownPreview
      content={content}
      baseUrl={window.API_BASE_URL}
      onLinkClick={onLinkClick}
      lookupFileByName={lookupFileByName}
    />
  );
};

export default ContentView;
