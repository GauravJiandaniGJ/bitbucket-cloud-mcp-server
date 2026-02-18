import { z } from 'zod';
import type { BitbucketClient } from '../services/bitbucket-client.js';
import type { BitbucketComment, BitbucketTask } from '../types/bitbucket.js';
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
    const commentsPath = `/repositories/${workspace}/${input.repo_slug}/pullrequests/${input.pr_id}/comments`;
    const tasksPath = `/repositories/${workspace}/${input.repo_slug}/pullrequests/${input.pr_id}/tasks`;

    const [comments, tasks] = await Promise.all([
      client.paginate<BitbucketComment>(commentsPath, input.limit),
      client.paginate<BitbucketTask>(tasksPath, input.limit).catch(() => [] as BitbucketTask[]),
    ]);

    // Build a map from comment ID -> tasks anchored to that comment
    const tasksByCommentId = new Map<number, BitbucketTask[]>();
    for (const task of tasks) {
      const existing = tasksByCommentId.get(task.comment.id) ?? [];
      existing.push(task);
      tasksByCommentId.set(task.comment.id, existing);
    }

    if (comments.length === 0 && tasks.length === 0) {
      return `No comments on PR #${input.pr_id} in ${workspace}/${input.repo_slug}.`;
    }

    const lines: string[] = [];

    if (comments.length > 0) {
      lines.push(`Found ${comments.length} comment(s) on PR #${input.pr_id}:\n`);

      for (const comment of comments) {
        const date = comment.created_on.split('T')[0];
        const time = comment.created_on.split('T')[1]?.slice(0, 5) || '';
        const author = comment.user.display_name;

        if (comment.inline) {
          const line = comment.inline.to ?? comment.inline.from ?? '?';
          lines.push(`[Comment #${comment.id}] [${date} ${time}] @${author} — INLINE on ${comment.inline.path}:${line}`);
        } else {
          lines.push(`[Comment #${comment.id}] [${date} ${time}] @${author} — General comment`);
        }

        if (comment.parent) {
          lines.push(`  (reply to comment #${comment.parent.id})`);
        }

        lines.push(`  ${comment.content.raw}`);

        // Show tasks anchored to this comment
        const commentTasks = tasksByCommentId.get(comment.id);
        if (commentTasks && commentTasks.length > 0) {
          for (const task of commentTasks) {
            const taskStatus = task.state === 'RESOLVED' ? '✓ RESOLVED' : '○ UNRESOLVED';
            lines.push(`  [Task #${task.id}] ${taskStatus}: ${task.content.raw}`);
            if (task.state === 'UNRESOLVED') {
              lines.push(`    → To resolve: use bitbucket_resolve_pr_comment with task_id=${task.id}`);
            }
          }
        }

        lines.push('');
      }
    }

    // Show standalone tasks not anchored to any listed comment
    const listedCommentIds = new Set(comments.map((c) => c.id));
    const standaloneTasks = tasks.filter((t) => !listedCommentIds.has(t.comment.id));
    if (standaloneTasks.length > 0) {
      lines.push(`\nStandalone tasks (${standaloneTasks.length}):\n`);
      for (const task of standaloneTasks) {
        const taskStatus = task.state === 'RESOLVED' ? '✓ RESOLVED' : '○ UNRESOLVED';
        lines.push(`[Task #${task.id}] ${taskStatus}: ${task.content.raw}`);
        if (task.state === 'UNRESOLVED') {
          lines.push(`  → To resolve: use bitbucket_resolve_pr_comment with task_id=${task.id}`);
        }
      }
    }

    return lines.join('\n');
  } catch (error) {
    return handleApiError(error, `listing comments on PR #${input.pr_id}`);
  }
}
