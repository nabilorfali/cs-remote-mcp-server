import axios from 'axios';

interface OAuthConfig {
  appUid: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  region: string;
}

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number; // unix ms
  organization_uid?: string;
}

const REGION_URLS: Record<string, { app: string; api: string }> = {
  'us':       { app: 'https://app.contentstack.com',        api: 'https://api.contentstack.io' },
  'eu':       { app: 'https://eu-app.contentstack.com',     api: 'https://eu-api.contentstack.com' },
  'azure-na': { app: 'https://azure-na-app.contentstack.com', api: 'https://azure-na-api.contentstack.com' },
  'azure-eu': { app: 'https://azure-eu-app.contentstack.com', api: 'https://azure-eu-api.contentstack.com' },
};

export class OAuthManager {
  private config: OAuthConfig;
  private urls: { app: string; api: string };

  constructor(config: OAuthConfig) {
    this.config = config;
    this.urls = REGION_URLS[config.region] ?? REGION_URLS['us'];
  }

  // Authorization URL: https://app.contentstack.com/apps/{app_uid}/authorize
  get authorizationUrl() {
    return `${this.urls.app}/apps/${this.config.appUid}/authorize`;
  }

  // Token URL: https://app.contentstack.com/apps-api/apps/token
  get tokenUrl() {
    return `${this.urls.app}/apps-api/apps/token`;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: [
        'cm.stacks.management:read',
        'cm.content-types.management:read',
        'cm.content-type:read',
        'cm.content-type:write',
        'cm.entries.management:read',
        'cm.entries.management:write',
        'cm.entry:read',
        'cm.entry:write',
        'cm.entry:publish',
        'cm.assets.management:read',
        'cm.asset:read',
        'cm.asset:write',
        'cm.environments.management:read',
        'cm.languages.management:read',
      ].join(' '),
      state,
    });
    return `${this.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<TokenSet> {
    const res = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return {
      ...res.data,
      expires_at: Date.now() + res.data.expires_in * 1000,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenSet> {
    const res = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return {
      ...res.data,
      expires_at: Date.now() + res.data.expires_in * 1000,
    };
  }
}
