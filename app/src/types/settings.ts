export enum SettingsActionType {
  INIT_SETTINGS = 'INIT_SETTINGS',
  UPDATE_LOCAL_SETTINGS = 'UPDATE_LOCAL_SETTINGS',
  MARK_SAVED = 'MARK_SAVED',
}

export interface UserProfileSettings {
  displayName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface ProfileSettingsState {
  localSettings: UserProfileSettings;
  initialSettings: UserProfileSettings;
  hasUnsavedChanges: boolean;
}

export interface SettingsAction<T> {
  type: SettingsActionType;
  payload?: T;
}
