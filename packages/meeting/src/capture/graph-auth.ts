/**
 * Microsoft Graph authentication abstraction (app-only / client credentials flow).
 * Kept behind an interface so the capture provider never hard-codes an auth library
 * and so tests can inject a fake token provider (no real Azure needed).
 */

export interface GraphAuthConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /** Sovereign-cloud override; defaults to the public Azure AD authority. */
  authorityHost?: string;
}

export interface GraphTokenProvider {
  getToken(): Promise<string>;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

/**
 * Acquires an app-only Graph token via the OAuth2 client-credentials grant and caches
 * it until shortly before expiry. Requires the caller's Azure AD app to hold
 * admin-consented application permissions (see docs/MEETING_CAPTURE.md).
 */
export class ClientCredentialsTokenProvider implements GraphTokenProvider {
  private cached?: { token: string; expiresAt: number };

  constructor(private readonly config: GraphAuthConfig) {}

  async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cached && this.cached.expiresAt > now + 60_000) {
      return this.cached.token;
    }

    const host = this.config.authorityHost ?? 'https://login.microsoftonline.com';
    const url = `${host}/${this.config.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      // Never include client_secret in errors.
      throw new Error(`Graph token request failed (${res.status}): ${detail.slice(0, 200)}`);
    }

    const json = (await res.json()) as TokenResponse;
    this.cached = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
    return json.access_token;
  }
}
