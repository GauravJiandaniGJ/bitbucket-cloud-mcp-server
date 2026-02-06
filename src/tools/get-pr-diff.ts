import { z } from 'zod';
import type { BitbucketClient } from '../services/bitbucket-client.js';
import { handleApiError } from '../utils/error-handler.js';

const MAX_DIFF_SIZE = 100_000; // ~100KB, safe for Claude context

export const getPrDiffSchema = z.object({
  workspace: z.string().optional().describe('Bitbucket workspace slug (uses default if not set)'),
  repo_slug: z.string().describe('Repository slug'),
  pr_id: z.number().describe('Pull request ID'),
});

export type GetPrDiffInput = z.infer<typeof getPrDiffSchema>;

export async function getPrDiff(client: BitbucketClient, input: GetPrDiffInput): Promise<string> {
  try {
    const workspace = client.resolveWorkspace(input.workspace);
    const path = `/repositories/${workspace}/${input.repo_slug}/pullrequests/${input.pr_id}/diff`;
    const diff = await client.requestText(path);

    if (!diff || diff.trim().length === 0) {
      return `PR #${input.pr_id} has no changes (empty diff).`;
    }

    // Parse basic stats from the diff
    const files = diff.split('diff --git').filter(Boolean);
    const additions = (diff.match(/^\+[^+]/gm) || []).length;
    const deletions = (diff.match(/^-[^-]/gm) || []).length;

    const header = [
      `Diff for PR #${input.pr_id} in ${workspace}/${input.repo_slug}`,
      `Files changed: ${files.length}`,
      `Additions: +${additions} | Deletions: -${deletions}`,
      '',
    ].join('\n');

    if (diff.length > MAX_DIFF_SIZE) {
      // Extract file names for summary
      const fileNames = files
        .map((f) => {
          const match = f.match(/a\/(.+?) b\//);
          return match ? match[1] : 'unknown';
        })
        .filter((f) => f !== 'unknown');

      return [
        header,
        `WARNING: Diff is large (${Math.round(diff.length / 1024)}KB). Showing truncated version.`,
        '',
        'Files in this PR:',
        ...fileNames.map((f) => `  - ${f}`),
        '',
        '--- Truncated Diff ---',
        diff.slice(0, MAX_DIFF_SIZE),
        '',
        `... (truncated, ${diff.length - MAX_DIFF_SIZE} bytes omitted)`,
      ].join('\n');
    }

    return header + diff;
  } catch (error) {
    return handleApiError(error, `getting diff for PR #${input.pr_id}`);
  }
}
