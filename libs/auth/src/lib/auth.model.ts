export interface BrowserSessionUser {
  email: string;
  name: string;
  subject: string;
}

export interface BrowserSession {
  authenticated: true;
  csrfToken: string;
  expiresAt: number;
  organizationId?: string;
  permissions: readonly string[];
  user: BrowserSessionUser;
}

export interface BffLogoutResponse {
  logoutUrl: string;
}
