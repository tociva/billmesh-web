export interface BrowserSessionUser {
  email: string;
  name: string;
  subject: string;
}

export interface BrowserSessionContext {
  application: string;
  environment: string;
  organization_id: string;
}

export interface BrowserSession {
  authenticated: true;
  context: BrowserSessionContext;
  csrfToken: string;
  expiresAt: string;
  permissions: readonly string[];
  user: BrowserSessionUser;
}

export interface BffLogoutResponse {
  logoutUrl: string;
}
