import React from 'react';
import { Text, Toggle, Tooltip } from '@geist-ui/core';

const EditorSettings = ({ autoSave, onAutoSaveChange }) => {
  return (
    <div className="setting-group">
      <Text h4>Editor</Text>
      <div className="setting-item">
        <Text>Auto Save</Text>
        <Tooltip
          text="Auto Save feature is coming soon!"
          type="dark"
          placement="left"
        >
          <Toggle
            checked={autoSave}
            onChange={(e) => onAutoSaveChange(e.target.checked)}
            disabled
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default EditorSettings;
