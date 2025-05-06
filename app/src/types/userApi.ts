// UpdateProfileRequest represents a user profile update request
export interface UpdateProfileRequest {
  displayName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

// DeleteAccountRequest represents a user account deletion request
export interface DeleteAccountRequest {
  password: string;
}
