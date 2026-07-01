import type { App } from 'obsidian';
import type { SupportedProvider } from '../../domain';

const SECRET_PREFIX = 'video-to-obsidian';

export class AiCredentialStore {
  constructor(private readonly app: App) {}

  getApiKey(provider: SupportedProvider): string {
    return this.app.secretStorage.getSecret(apiKeySecretId(provider))?.trim() ?? '';
  }

  setApiKey(provider: SupportedProvider, apiKey: string): void {
    this.app.secretStorage.setSecret(apiKeySecretId(provider), apiKey.trim());
  }
}

export function apiKeySecretId(provider: SupportedProvider): string {
  return `${SECRET_PREFIX}-${provider}-api-key`;
}
