import { z } from 'zod';
import type { BitbucketClient } from '../services/bitbucket-client.js';
import type { BitbucketTask } from '../types/bitbucket.js';
import { handleApiError } from '../utils/error-handler.js';

export const resolvePrCommentSchema = z.object({
  workspace: z.string().optional().describe('Bitbucket workspace slug (uses default if not set)'),
  repo_slug: z.string().describe('Repository slug'),
  pr_id: z.number().describe('Pull request ID'),
  task_id: z.number().describe('Task ID to resolve (from bitbucket_list_pr_comments output)'),
});

export type ResolvePrCommentInput = z.infer<typeof resolvePrCommentSchema>;

export async function resolvePrComment(
  client: BitbucketClient,
  input: ResolvePrCommentInput,
): Promise<string> {
  try {
    const workspace = client.resolveWorkspace(input.workspace);
    const path = `/repositories/${workspace}/${input.repo_slug}/pullrequests/${input.pr_id}/tasks/${input.task_id}`;

    const task = await client.request<BitbucketTask>(path, {
      method: 'PUT',
      body: JSON.stringify({ state: 'RESOLVED' }),
    });

    return [
      `Task #${task.id} resolved on PR #${input.pr_id}.`,
      `State: ${task.state}`,
      `Task: ${task.content.raw}`,
    ].join('\n');
  } catch (error) {
    return handleApiError(error, `resolving task #${input.task_id} on PR #${input.pr_id}`);
  }
}
