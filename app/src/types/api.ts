declare global {
  interface Window {
    API_BASE_URL: string;
  }
}

export const API_BASE_URL = window.API_BASE_URL;
