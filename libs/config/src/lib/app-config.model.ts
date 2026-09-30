export interface AuthConfig {
  bffBaseUrl: string;
  defaultReturnPath: string;
}

export interface AppConfig {
  apiBaseUrl: string;
  auth: AuthConfig;
}
