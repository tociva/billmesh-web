export interface AuthConfig {
  bffBaseUrl: string;
}

export interface AppConfig {
  apiBaseUrl: string;
  auth: AuthConfig;
}
