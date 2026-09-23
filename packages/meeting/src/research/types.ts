/**
 * Optional web-research abstraction. This is INDEPENDENT of OpenAI and Azure — it uses
 * only its own credentials (APIFY_API_TOKEN) and is disabled by default. It must never
 * be a mandatory dependency for meeting capture or AI features.
 */

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebResearchProvider {
  readonly name: string;
  isEnabled(): boolean;
  /** Runs a web research query. Throws a clear error when disabled/unconfigured. */
  search(query: string, options?: { limit?: number }): Promise<ResearchResult[]>;
}

export class ResearchDisabledError extends Error {
  constructor(message = 'Web research is disabled (set APIFY_ENABLED=true and APIFY_API_TOKEN).') {
    super(message);
    this.name = 'ResearchDisabledError';
  }
}
