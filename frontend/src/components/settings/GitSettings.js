import React from 'react';
import { Text, Toggle, Input, Spacer } from '@geist-ui/core';

const GitSettings = ({
  gitEnabled,
  gitUrl,
  gitUser,
  gitToken,
  gitAutoCommit,
  gitCommitMsgTemplate,
  onInputChange,
}) => {
  return (
    <div className="setting-group">
      <Text h4>Git Integration</Text>
      <div className="setting-item">
        <Text>Enable Git</Text>
        <Toggle
          checked={gitEnabled}
          onChange={(e) => onInputChange('gitEnabled', e.target.checked)}
        />
      </div>
      <div className={gitEnabled ? '' : 'disabled'}>
        <Input
          width="100%"
          label="Git URL"
          value={gitUrl}
          onChange={(e) => onInputChange('gitUrl', e.target.value)}
          disabled={!gitEnabled}
        />
        <Spacer h={0.5} />
        <Input
          width="100%"
          label="Git Username"
          value={gitUser}
          onChange={(e) => onInputChange('gitUser', e.target.value)}
          disabled={!gitEnabled}
        />
        <Spacer h={0.5} />
        <Input.Password
          width="100%"
          label="Git Token"
          value={gitToken}
          onChange={(e) => onInputChange('gitToken', e.target.value)}
          disabled={!gitEnabled}
        />
        <Spacer h={0.5} />
        <div className="setting-item">
          <Text>Auto Commit</Text>
          <Toggle
            checked={gitAutoCommit}
            onChange={(e) => onInputChange('gitAutoCommit', e.target.checked)}
            disabled={!gitEnabled}
          />
        </div>
        <Spacer h={0.5} />
        <Input
          width="100%"
          label="Commit Message Template"
          value={gitCommitMsgTemplate}
          onChange={(e) =>
            onInputChange('gitCommitMsgTemplate', e.target.value)
          }
          disabled={!gitEnabled}
        />
      </div>
    </div>
  );
};

export default GitSettings;
