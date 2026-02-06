import { BitbucketApiError } from '../utils/error-handler.js';
import { logger } from '../utils/logger.js';
import type { PaginatedResponse } from '../types/bitbucket.js';

interface ClientConfig {
  email: string;
  apiToken: string;
  defaultWorkspace?: string;
  baseUrl: string;
}

export class BitbucketClient {
  private config: ClientConfig;
  private authHeader: string;

  constructor() {
    const email = process.env.BITBUCKET_EMAIL;
    const apiToken = process.env.BITBUCKET_API_TOKEN;

    if (!email || !apiToken) {
      throw new Error(
        [
          'Missing credentials. Set these environment variables:',
          '  BITBUCKET_EMAIL    - Your Atlassian account email',
          '  BITBUCKET_API_TOKEN - Your Bitbucket API token',
          '',
          'Create an API token at: https://bitbucket.org/account/settings/api-tokens/',
        ].join('\n'),
      );
    }

    this.config = {
      email,
      apiToken,
      defaultWorkspace: process.env.BITBUCKET_WORKSPACE,
      baseUrl: process.env.BITBUCKET_API_BASE_URL || 'https://api.bitbucket.org/2.0',
    };

    // Bitbucket API tokens use Basic Auth: email:api_token
    this.authHeader = 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64');
  }

  resolveWorkspace(workspace?: string): string {
    const ws = workspace || this.config.defaultWorkspace;
    if (!ws) {
      throw new Error(
        'No workspace specified. Provide workspace parameter or set BITBUCKET_WORKSPACE env var.',
      );
    }
    return ws;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.config.baseUrl}${path}`;

    logger.debug(`${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BitbucketApiError(response.status, response.statusText, body, `${options.method || 'GET'} ${path}`);
    }

    return response.json() as Promise<T>;
  }

  async requestText(path: string): Promise<string> {
    const url = path.startsWith('http') ? path : `${this.config.baseUrl}${path}`;

    logger.debug(`GET (text) ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: 'text/plain',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BitbucketApiError(response.status, response.statusText, body, `GET ${path}`);
    }

    return response.text();
  }

  async paginate<T>(path: string, limit: number = 50): Promise<T[]> {
    const results: T[] = [];
    let url: string | undefined = `${this.config.baseUrl}${path}`;
    const separator = path.includes('?') ? '&' : '?';
    url = `${this.config.baseUrl}${path}${separator}pagelen=${Math.min(limit, 100)}`;

    while (url && results.length < limit) {
      const page: PaginatedResponse<T> = await this.request<PaginatedResponse<T>>(url);
      results.push(...page.values);
      url = page.next;
    }

    return results.slice(0, limit);
  }
}
