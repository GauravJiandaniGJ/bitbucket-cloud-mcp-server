import { z } from 'zod';
import type { BitbucketClient } from '../services/bitbucket-client.js';
import type { BitbucketComment, BitbucketTask } from '../types/bitbucket.js';
import { handleApiError } from '../utils/error-handler.js';

export const fetchAndResolvePrCommentsSchema = z.object({
  workspace: z.string().optional().describe('Bitbucket workspace slug (uses default if not set)'),
  repo_slug: z.string().describe('Repository slug'),
  pr_id: z.number().describe('Pull request ID'),
});

export type FetchAndResolvePrCommentsInput = z.infer<typeof fetchAndResolvePrCommentsSchema>;

export async function fetchAndResolvePrComments(
  client: BitbucketClient,
  input: FetchAndResolvePrCommentsInput,
): Promise<string> {
  try {
    const workspace = client.resolveWorkspace(input.workspace);
    const commentsPath = `/repositories/${workspace}/${input.repo_slug}/pullrequests/${input.pr_id}/comments`;
    const tasksPath = `/repositories/${workspace}/${input.repo_slug}/pullrequests/${input.pr_id}/tasks`;

    // Step 1: Fetch comments and tasks in parallel
    const [comments, tasks] = await Promise.all([
      client.paginate<BitbucketComment>(commentsPath, 100),
      client.paginate<BitbucketTask>(tasksPath, 100).catch(() => [] as BitbucketTask[]),
    ]);

    const lines: string[] = [`PR #${input.pr_id} — ${workspace}/${input.repo_slug}\n`];
    lines.push(`Fetched ${comments.length} comment(s), ${tasks.length} task(s).\n`);

    // Build map: comment ID -> tasks anchored to it
    const tasksByCommentId = new Map<number, BitbucketTask[]>();
    for (const task of tasks) {
      const existing = tasksByCommentId.get(task.comment.id) ?? [];
      existing.push(task);
      tasksByCommentId.set(task.comment.id, existing);
    }

    // Separate bot comments (CodeRabbit, etc.) from human comments
    const botPatterns = [/coderabbit/i, /bot$/i, /\[bot\]/i];
    const isBot = (name: string) => botPatterns.some((p) => p.test(name));

    const humanComments = comments.filter((c) => !isBot(c.user.display_name) && !c.parent);
    const botComments = comments.filter((c) => isBot(c.user.display_name) && !c.parent);

    // Step 2a: Show all comments grouped
    lines.push('--- ALL COMMENTS ---\n');
    for (const comment of comments) {
      const author = comment.user.display_name;
      const tag = isBot(author) ? '[BOT]' : '[HUMAN]';
      if (comment.inline) {
        const line = comment.inline.to ?? comment.inline.from ?? '?';
        lines.push(`[Comment #${comment.id}] ${tag} @${author} — ${comment.inline.path}:${line}`);
      } else {
        lines.push(`[Comment #${comment.id}] ${tag} @${author} — General`);
      }
      if (comment.parent) {
        lines.push(`  (reply to #${comment.parent.id})`);
      }
      lines.push(`  ${comment.content.raw}`);

      const commentTasks = tasksByCommentId.get(comment.id);
      if (commentTasks) {
        for (const t of commentTasks) {
          lines.push(`  [Task #${t.id}] ${t.state}: ${t.content.raw}`);
        }
      }
      lines.push('');
    }

    // Step 2b: Highlight human comments that need attention
    if (humanComments.length > 0) {
      lines.push('--- HUMAN REVIEW COMMENTS REQUIRING ATTENTION ---\n');
      for (const comment of humanComments) {
        const author = comment.user.display_name;
        if (comment.inline) {
          const line = comment.inline.to ?? comment.inline.from ?? '?';
          lines.push(`[Comment #${comment.id}] @${author} on ${comment.inline.path}:${line}`);
        } else {
          lines.push(`[Comment #${comment.id}] @${author} — General`);
        }
        lines.push(`  "${comment.content.raw}"`);
        lines.push(`  → Address this in code, then reply using bitbucket_post_pr_comment with parent_id=${comment.id}`);
        lines.push('');
      }
    }

    // Step 3: Resolve all unresolved Bitbucket tasks
    lines.push('--- TASK RESOLUTION ---\n');
    const unresolvedTasks = tasks.filter((t) => t.state === 'UNRESOLVED');

    if (unresolvedTasks.length === 0) {
      lines.push('No unresolved tasks to resolve.');
    } else {
      lines.push(`Resolving ${unresolvedTasks.length} unresolved task(s)...\n`);

      const resolveResults = await Promise.allSettled(
        unresolvedTasks.map((task) =>
          client.request<BitbucketTask>(
            `/repositories/${workspace}/${input.repo_slug}/pullrequests/${input.pr_id}/tasks/${task.id}`,
            { method: 'PUT', body: JSON.stringify({ state: 'RESOLVED' }) },
          ),
        ),
      );

      let resolved = 0;
      let failed = 0;

      for (let i = 0; i < unresolvedTasks.length; i++) {
        const task = unresolvedTasks[i];
        const result = resolveResults[i];
        if (result.status === 'fulfilled') {
          lines.push(`  ✓ Resolved Task #${task.id}: ${task.content.raw}`);
          resolved++;
        } else {
          lines.push(`  ✗ Failed Task #${task.id}: ${task.content.raw}`);
          lines.push(`    Error: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
          failed++;
        }
      }

      lines.push(`\nTasks done. ${resolved} resolved, ${failed} failed.`);
    }

    lines.push(`\nSummary: ${botComments.length} bot comment(s), ${humanComments.length} human comment(s) needing review.`);
    return lines.join('\n');
  } catch (error) {
    return handleApiError(error, `fetching and resolving comments on PR #${input.pr_id}`);
  }
}
