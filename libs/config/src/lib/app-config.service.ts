import { Injectable } from '@angular/core';
import type { AppConfig, AuthConfig } from './app-config.model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Config field "${fieldName}" must be a non-empty string.`);
  }

  return value.trim();
}

function parseAuthConfig(value: unknown): AuthConfig {
  if (!isRecord(value)) {
    throw new Error('Config section "auth" is invalid.');
  }

  const defaultReturnPath = asString(
    value['defaultReturnPath'],
    'auth.defaultReturnPath',
  );
  if (
    !defaultReturnPath.startsWith('/') ||
    defaultReturnPath.startsWith('//')
  ) {
    throw new Error(
      'Config field "auth.defaultReturnPath" must be an app path.',
    );
  }

  return {
    bffBaseUrl: asString(value['bffBaseUrl'], 'auth.bffBaseUrl'),
    defaultReturnPath,
  };
}

function parseAppConfig(value: unknown): AppConfig {
  if (!isRecord(value)) {
    throw new Error('Config payload is invalid.');
  }

  return {
    apiBaseUrl: asString(value['apiBaseUrl'], 'apiBaseUrl'),
    auth: parseAuthConfig(value['auth']),
  };
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  async loadConfig(): Promise<AppConfig> {
    const response = await fetch('/config/config.json', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`Failed to load app config: ${response.status}.`);
    }

    return parseAppConfig(await response.json());
  }
}
