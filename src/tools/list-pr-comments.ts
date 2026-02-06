import { z } from 'zod';
import type { BitbucketClient } from '../services/bitbucket-client.js';
import type { BitbucketComment } from '../types/bitbucket.js';
import { handleApiError } from '../utils/error-handler.js';

export const listPrCommentsSchema = z.object({
  workspace: z.string().optional().describe('Bitbucket workspace slug (uses default if not set)'),
  repo_slug: z.string().describe('Repository slug'),
  pr_id: z.number().describe('Pull request ID'),
  limit: z.number().optional().default(100).describe('Max comments to return'),
});

export type ListPrCommentsInput = z.infer<typeof listPrCommentsSchema>;

export async function listPrComments(
  client: BitbucketClient,
  input: ListPrCommentsInput,
): Promise<string> {
  try {
    const workspace = client.resolveWorkspace(input.workspace);
    const path = `/repositories/${workspace}/${input.repo_slug}/pullrequests/${input.pr_id}/comments`;
    const comments = await client.paginate<BitbucketComment>(path, input.limit);

    if (comments.length === 0) {
      return `No comments on PR #${input.pr_id} in ${workspace}/${input.repo_slug}.`;
    }

    const lines = [
      `Found ${comments.length} comment(s) on PR #${input.pr_id}:\n`,
    ];

    for (const comment of comments) {
      const date = comment.created_on.split('T')[0];
      const time = comment.created_on.split('T')[1]?.slice(0, 5) || '';
      const author = comment.user.display_name;

      if (comment.inline) {
        const line = comment.inline.to ?? comment.inline.from ?? '?';
        lines.push(`[${date} ${time}] @${author} — INLINE on ${comment.inline.path}:${line}`);
      } else {
        lines.push(`[${date} ${time}] @${author} — General comment`);
      }

      if (comment.parent) {
        lines.push(`  (reply to comment #${comment.parent.id})`);
      }

      lines.push(`  ${comment.content.raw}`);
      lines.push('');
    }

    return lines.join('\n');
  } catch (error) {
    return handleApiError(error, `listing comments on PR #${input.pr_id}`);
  }
}
