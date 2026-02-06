import { z } from 'zod';
import type { BitbucketClient } from '../services/bitbucket-client.js';
import type { BitbucketPullRequest } from '../types/bitbucket.js';
import { handleApiError } from '../utils/error-handler.js';

export const getPrSchema = z.object({
  workspace: z.string().optional().describe('Bitbucket workspace slug (uses default if not set)'),
  repo_slug: z.string().describe('Repository slug'),
  pr_id: z.number().describe('Pull request ID'),
});

export type GetPrInput = z.infer<typeof getPrSchema>;

export async function getPr(client: BitbucketClient, input: GetPrInput): Promise<string> {
  try {
    const workspace = client.resolveWorkspace(input.workspace);
    const path = `/repositories/${workspace}/${input.repo_slug}/pullrequests/${input.pr_id}`;
    const pr = await client.request<BitbucketPullRequest>(path);

    const reviewers =
      pr.reviewers.length > 0
        ? pr.reviewers.map((r) => r.display_name).join(', ')
        : 'None';

    const lines = [
      `PR #${pr.id}: ${pr.title}`,
      `State: ${pr.state}`,
      `Author: ${pr.author.display_name}`,
      `Branch: ${pr.source.branch.name} → ${pr.destination.branch.name}`,
      `Reviewers: ${reviewers}`,
      `Created: ${pr.created_on}`,
      `Updated: ${pr.updated_on}`,
      `Comments: ${pr.comment_count} | Tasks: ${pr.task_count}`,
      `URL: ${pr.links.html.href}`,
    ];

    if (pr.description) {
      lines.push('', '--- Description ---', pr.description);
    }

    return lines.join('\n');
  } catch (error) {
    return handleApiError(error, `getting PR #${input.pr_id}`);
  }
}
