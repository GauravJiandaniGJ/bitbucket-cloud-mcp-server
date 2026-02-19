import { z } from 'zod';
import type { BitbucketClient } from '../services/bitbucket-client.js';
import type { BitbucketComment } from '../types/bitbucket.js';
import { handleApiError } from '../utils/error-handler.js';

export const postPrCommentSchema = z.object({
  workspace: z.string().optional().describe('Bitbucket workspace slug (uses default if not set)'),
  repo_slug: z.string().describe('Repository slug'),
  pr_id: z.number().describe('Pull request ID'),
  content: z.string().describe('Comment content (markdown supported)'),
  inline: z
    .object({
      path: z.string().describe('File path for inline comment'),
      line: z.number().describe('Line number for inline comment'),
    })
    .optional()
    .describe('Set this for inline comments on a specific file and line'),
});

export type PostPrCommentInput = z.infer<typeof postPrCommentSchema>;

export async function postPrComment(
  client: BitbucketClient,
  input: PostPrCommentInput,
): Promise<string> {
  try {
    const workspace = client.resolveWorkspace(input.workspace);
    const path = `/repositories/${workspace}/${input.repo_slug}/pullrequests/${input.pr_id}/comments`;

    const body: Record<string, unknown> = {
      content: { raw: input.content },
    };

    if (input.inline) {
      body.inline = {
        to: input.inline.line,
        path: input.inline.path,
      };
    }

    const comment = await client.request<BitbucketComment>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const lines = [`Comment posted on PR #${input.pr_id}.`];
    lines.push(`Comment ID: ${comment.id}`);

    if (input.inline) {
      lines.push(`Type: Inline comment on ${input.inline.path}:${input.inline.line}`);
    } else {
      lines.push('Type: General comment');
    }

    lines.push(`URL: ${comment.links.html.href}`);

    return lines.join('\n');
  } catch (error) {
    return handleApiError(error, `posting comment on PR #${input.pr_id}`);
  }
}
