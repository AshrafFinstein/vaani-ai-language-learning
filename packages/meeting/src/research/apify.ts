import {
  ResearchDisabledError,
  type ResearchResult,
  type WebResearchProvider,
} from './types.js';

export interface ApifyConfig {
  /** APIFY_ENABLED — off by default. */
  enabled: boolean;
  /** APIFY_API_TOKEN — used ONLY for Apify; never shared with OpenAI/Azure. */
  apiToken?: string;
  /** Actor to run for search (defaults to a Google-search scraper actor id/slug). */
  actorId?: string;
  baseUrl?: string;
}

interface ApifyDatasetItem {
  title?: string;
  url?: string;
  link?: string;
  description?: string;
  snippet?: string;
}

/**
 * Apify-backed web research. Fully independent and OPT-IN: unless `APIFY_ENABLED=true`
 * and a token are present, `search()` throws {@link ResearchDisabledError}. Runs an
 * actor synchronously and maps its dataset items to {@link ResearchResult}s. It never
 * fabricates results and is never required by any other feature.
 */
export class ApifyResearchProvider implements WebResearchProvider {
  readonly name = 'apify';
  private readonly base: string;
  private readonly actorId: string;

  constructor(private readonly config: ApifyConfig) {
    this.base = (config.baseUrl ?? 'https://api.apify.com/v2').replace(/\/$/, '');
    this.actorId = config.actorId ?? 'apify~google-search-scraper';
  }

  isEnabled(): boolean {
    return Boolean(this.config.enabled && this.config.apiToken);
  }

  async search(query: string, options?: { limit?: number }): Promise<ResearchResult[]> {
    if (!this.config.enabled) {
      throw new ResearchDisabledError('Apify web research is disabled (set APIFY_ENABLED=true).');
    }
    if (!this.config.apiToken) {
      throw new ResearchDisabledError('APIFY_ENABLED is true but APIFY_API_TOKEN is missing.');
    }

    const limit = options?.limit ?? 5;
    const res = await fetch(
      `${this.base}/acts/${this.actorId}/run-sync-get-dataset-items?token=${this.config.apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: query, maxPagesPerQuery: 1, resultsPerPage: limit }),
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Apify run failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    const items = (await res.json()) as ApifyDatasetItem[];
    return items.slice(0, limit).map((it) => ({
      title: it.title ?? '',
      url: it.url ?? it.link ?? '',
      snippet: it.description ?? it.snippet ?? '',
    }));
  }
}

/** Disabled research provider — the default. `search()` always throws a clear error. */
export class DisabledResearchProvider implements WebResearchProvider {
  readonly name = 'disabled';
  isEnabled(): boolean {
    return false;
  }
  search(): Promise<ResearchResult[]> {
    return Promise.reject(new ResearchDisabledError());
  }
}

export interface ResearchEnv {
  apifyEnabled?: boolean;
  apifyApiToken?: string;
  apifyActorId?: string;
}

/** Returns the Apify provider only when enabled + token present; else the disabled one. */
export function createWebResearchProvider(env: ResearchEnv = {}): WebResearchProvider {
  if (env.apifyEnabled && env.apifyApiToken) {
    return new ApifyResearchProvider({
      enabled: true,
      apiToken: env.apifyApiToken,
      actorId: env.apifyActorId,
    });
  }
  return new DisabledResearchProvider();
}
