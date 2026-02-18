import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { BitbucketClient } from '../services/bitbucket-client.js';
import { logger } from '../utils/logger.js';

import { listPrsSchema, listPrs } from './list-prs.js';
import { getPrSchema, getPr } from './get-pr.js';
import { getPrDiffSchema, getPrDiff } from './get-pr-diff.js';
import { listPrCommentsSchema, listPrComments } from './list-pr-comments.js';
import { postPrCommentSchema, postPrComment } from './post-pr-comment.js';
import { resolvePrCommentSchema, resolvePrComment } from './resolve-pr-comment.js';
import { fetchAndResolvePrCommentsSchema, fetchAndResolvePrComments } from './fetch-and-resolve-pr-comments.js';

import { zodToJsonSchema } from '../utils/zod-to-json-schema.js';

export function registerTools(server: Server): void {
  const client = new BitbucketClient();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'bitbucket_list_prs',
        description:
          'List pull requests for a Bitbucket Cloud repository. Returns PR titles, authors, branches, and URLs.',
        inputSchema: zodToJsonSchema(listPrsSchema),
      },
      {
        name: 'bitbucket_get_pr',
        description:
          'Get full details of a single pull request including description, reviewers, and status.',
        inputSchema: zodToJsonSchema(getPrSchema),
      },
      {
        name: 'bitbucket_get_pr_diff',
        description:
          'Get the full diff (code changes) for a pull request. Use this to review what code was changed.',
        inputSchema: zodToJsonSchema(getPrDiffSchema),
      },
      {
        name: 'bitbucket_list_pr_comments',
        description:
          'List all comments on a pull request, including inline code comments and general comments.',
        inputSchema: zodToJsonSchema(listPrCommentsSchema),
      },
      {
        name: 'bitbucket_post_pr_comment',
        description:
          'Post a comment on a pull request. Supports both general comments and inline comments on specific files/lines.',
        inputSchema: zodToJsonSchema(postPrCommentSchema),
      },
      {
        name: 'bitbucket_resolve_pr_comment',
        description:
          'Resolve a task on a pull request. Use bitbucket_list_pr_comments first to get the task_id, then call this tool to mark the task as resolved.',
        inputSchema: zodToJsonSchema(resolvePrCommentSchema),
      },
      {
        name: 'bitbucket_fetch_and_resolve_pr_comments',
        description:
          'Fetch all comments on a pull request and automatically resolve all unresolved tasks in one step. Shows every comment, then resolves all pending tasks.',
        inputSchema: zodToJsonSchema(fetchAndResolvePrCommentsSchema),
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`Tool called: ${name}`);

    let result: string;

    switch (name) {
      case 'bitbucket_list_prs':
        result = await listPrs(client, listPrsSchema.parse(args));
        break;
      case 'bitbucket_get_pr':
        result = await getPr(client, getPrSchema.parse(args));
        break;
      case 'bitbucket_get_pr_diff':
        result = await getPrDiff(client, getPrDiffSchema.parse(args));
        break;
      case 'bitbucket_list_pr_comments':
        result = await listPrComments(client, listPrCommentsSchema.parse(args));
        break;
      case 'bitbucket_post_pr_comment':
        result = await postPrComment(client, postPrCommentSchema.parse(args));
        break;
      case 'bitbucket_resolve_pr_comment':
        result = await resolvePrComment(client, resolvePrCommentSchema.parse(args));
        break;
      case 'bitbucket_fetch_and_resolve_pr_comments':
        result = await fetchAndResolvePrComments(client, fetchAndResolvePrCommentsSchema.parse(args));
        break;
      default:
        result = `Unknown tool: ${name}`;
    }

    return {
      content: [{ type: 'text', text: result }],
    };
  });
}
