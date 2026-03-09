import axios, { AxiosInstance, AxiosError } from 'axios';

const REGION_API: Record<string, string> = {
  'us':       'https://api.contentstack.io/v3',
  'eu':       'https://eu-api.contentstack.com/v3',
  'azure-na': 'https://azure-na-api.contentstack.com/v3',
  'azure-eu': 'https://azure-eu-api.contentstack.com/v3',
};

export class ContentstackClient {
  private http: AxiosInstance;
  private organizationUid?: string;

  constructor(accessToken: string, region = 'us', organizationUid?: string) {
    const baseURL = REGION_API[region] ?? REGION_API['us'];
    this.organizationUid = organizationUid;
    this.http = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private stackHeaders(stackApiKey: string) {
    return { api_key: stackApiKey };
  }

  // ── Stacks ────────────────────────────────────────────────────────────────

  async listStacks(organizationUid?: string) {
    const orgUid = organizationUid ?? this.organizationUid;
    const params = orgUid ? { organization_uid: orgUid } : {};
    const res = await this.http.get('/stacks', { params });
    return res.data;
  }

  async getStack(stackApiKey: string) {
    const res = await this.http.get('/stacks', {
      headers: this.stackHeaders(stackApiKey),
    });
    return res.data;
  }

  // ── Content Types ─────────────────────────────────────────────────────────

  async listContentTypes(stackApiKey: string) {
    const res = await this.http.get('/content_types', {
      headers: this.stackHeaders(stackApiKey),
    });
    return res.data;
  }

  async getContentType(stackApiKey: string, uid: string) {
    const res = await this.http.get(`/content_types/${uid}`, {
      headers: this.stackHeaders(stackApiKey),
    });
    return res.data;
  }

  // ── Entries ───────────────────────────────────────────────────────────────

  async listEntries(stackApiKey: string, contentTypeUid: string, params?: Record<string, unknown>) {
    const res = await this.http.get(`/content_types/${contentTypeUid}/entries`, {
      headers: this.stackHeaders(stackApiKey),
      params,
    });
    return res.data;
  }

  async getEntry(stackApiKey: string, contentTypeUid: string, entryUid: string) {
    const res = await this.http.get(`/content_types/${contentTypeUid}/entries/${entryUid}`, {
      headers: this.stackHeaders(stackApiKey),
    });
    return res.data;
  }

  async createEntry(stackApiKey: string, contentTypeUid: string, entry: Record<string, unknown>) {
    const res = await this.http.post(
      `/content_types/${contentTypeUid}/entries`,
      { entry },
      { headers: this.stackHeaders(stackApiKey) }
    );
    return res.data;
  }

  async updateEntry(
    stackApiKey: string,
    contentTypeUid: string,
    entryUid: string,
    entry: Record<string, unknown>
  ) {
    const res = await this.http.put(
      `/content_types/${contentTypeUid}/entries/${entryUid}`,
      { entry },
      { headers: this.stackHeaders(stackApiKey) }
    );
    return res.data;
  }

  async publishEntry(
    stackApiKey: string,
    contentTypeUid: string,
    entryUid: string,
    environments: string[],
    locales: string[]
  ) {
    const res = await this.http.post(
      `/content_types/${contentTypeUid}/entries/${entryUid}/publish`,
      {
        entry: {
          environments,
          locales,
        },
      },
      { headers: this.stackHeaders(stackApiKey) }
    );
    return res.data;
  }

  async deleteEntry(stackApiKey: string, contentTypeUid: string, entryUid: string) {
    const res = await this.http.delete(`/content_types/${contentTypeUid}/entries/${entryUid}`, {
      headers: this.stackHeaders(stackApiKey),
    });
    return res.data;
  }

  // ── Assets ────────────────────────────────────────────────────────────────

  async listAssets(stackApiKey: string) {
    const res = await this.http.get('/assets', {
      headers: this.stackHeaders(stackApiKey),
    });
    return res.data;
  }

  async getAsset(stackApiKey: string, assetUid: string) {
    const res = await this.http.get(`/assets/${assetUid}`, {
      headers: this.stackHeaders(stackApiKey),
    });
    return res.data;
  }

  // ── Environments & Locales ────────────────────────────────────────────────

  async listEnvironments(stackApiKey: string) {
    const res = await this.http.get('/environments', {
      headers: this.stackHeaders(stackApiKey),
    });
    return res.data;
  }

  async listLocales(stackApiKey: string) {
    const res = await this.http.get('/locales', {
      headers: this.stackHeaders(stackApiKey),
    });
    return res.data;
  }
}

export function formatError(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    return JSON.stringify(data ?? { message: error.message }, null, 2);
  }
  return String(error);
}
