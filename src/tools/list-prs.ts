import { z } from 'zod';
import type { BitbucketClient } from '../services/bitbucket-client.js';
import type { BitbucketPullRequest } from '../types/bitbucket.js';
import { handleApiError } from '../utils/error-handler.js';

export const listPrsSchema = z.object({
  workspace: z.string().optional().describe('Bitbucket workspace slug (uses default if not set)'),
  repo_slug: z.string().describe('Repository slug'),
  state: z
    .enum(['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED'])
    .optional()
    .default('OPEN')
    .describe('PR state filter'),
  limit: z.number().optional().default(25).describe('Max results to return'),
});

export type ListPrsInput = z.infer<typeof listPrsSchema>;

export async function listPrs(client: BitbucketClient, input: ListPrsInput): Promise<string> {
  try {
    const workspace = client.resolveWorkspace(input.workspace);
    const path = `/repositories/${workspace}/${input.repo_slug}/pullrequests?state=${input.state}`;
    const prs = await client.paginate<BitbucketPullRequest>(path, input.limit);

    if (prs.length === 0) {
      return `No ${input.state.toLowerCase()} pull requests found in ${workspace}/${input.repo_slug}.`;
    }

    const lines = [`Found ${prs.length} ${input.state.toLowerCase()} pull request(s) in ${workspace}/${input.repo_slug}:\n`];

    for (const pr of prs) {
      lines.push(`PR #${pr.id}: ${pr.title}`);
      lines.push(`  Author: ${pr.author.display_name}`);
      lines.push(`  Branch: ${pr.source.branch.name} → ${pr.destination.branch.name}`);
      lines.push(`  Created: ${pr.created_on.split('T')[0]}`);
      lines.push(`  Comments: ${pr.comment_count} | Tasks: ${pr.task_count}`);
      lines.push(`  URL: ${pr.links.html.href}`);
      lines.push('');
    }

    return lines.join('\n');
  } catch (error) {
    return handleApiError(error, 'listing pull requests');
  }
}
