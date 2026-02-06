import { logger } from './logger.js';

export function handleApiError(error: unknown, context: string): string {
  logger.error(`${context}:`, error);

  if (error instanceof BitbucketApiError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      return `Network error: Could not connect to Bitbucket API. Check your internet connection.`;
    }
    return `Error in ${context}: ${error.message}`;
  }

  return `Unknown error in ${context}`;
}

export class BitbucketApiError extends Error {
  public userMessage: string;

  constructor(
    public statusCode: number,
    public statusText: string,
    public body: string,
    context: string,
  ) {
    super(`Bitbucket API ${statusCode}: ${statusText}`);
    this.name = 'BitbucketApiError';
    this.userMessage = formatUserMessage(statusCode, body, context);
  }
}

function formatUserMessage(statusCode: number, body: string, context: string): string {
  let detail = '';
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.error?.message || parsed?.message || '';
  } catch {
    detail = body.slice(0, 200);
  }

  switch (statusCode) {
    case 401:
      return [
        `Authentication failed (${context}).`,
        '',
        'Check that:',
        '1. BITBUCKET_EMAIL is your Atlassian account email',
        '2. BITBUCKET_API_TOKEN is a valid API token with required scopes',
        '3. Token has scopes: pullrequest:read, pullrequest:write, repository:read',
        '',
        'Create an API token at: https://bitbucket.org/account/settings/api-tokens/',
      ].join('\n');

    case 403:
      return [
        `Permission denied (${context}).`,
        detail ? `Detail: ${detail}` : '',
        '',
        'Ensure your app password has the required scopes.',
      ]
        .filter(Boolean)
        .join('\n');

    case 404:
      return [
        `Not found (${context}).`,
        detail ? `Detail: ${detail}` : '',
        '',
        'Check that the workspace, repository slug, and PR ID are correct.',
      ]
        .filter(Boolean)
        .join('\n');

    case 429:
      return [
        `Rate limit exceeded (${context}).`,
        '',
        'Bitbucket API rate limit hit. Wait a few minutes before retrying.',
      ].join('\n');

    default:
      return [
        `Bitbucket API error ${statusCode} (${context}).`,
        detail ? `Detail: ${detail}` : '',
      ]
        .filter(Boolean)
        .join('\n');
  }
}
