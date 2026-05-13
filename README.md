# bitbucket-cloud-mcp-server

A TypeScript-based MCP (Model Context Protocol) server for interacting with the Bitbucket Cloud API. Provides tools to list, review, comment on, and resolve tasks on pull requests — directly from Claude Code.

## Features

| Tool | Description |
|---|---|
| `bitbucket_list_prs` | List pull requests for a repository |
| `bitbucket_get_pr` | Get full details of a single PR (description, reviewers, status) |
| `bitbucket_get_pr_diff` | Get the code diff for a PR |
| `bitbucket_list_pr_comments` | List all comments and tasks on a PR, with task IDs for resolution |
| `bitbucket_post_pr_comment` | Post general or inline comments on a PR |
| `bitbucket_resolve_pr_comment` | Resolve a specific task by task ID |
| `bitbucket_fetch_and_resolve_pr_comments` | Fetch all comments and auto-resolve all unresolved tasks in one call |

## Setup Guide

### Prerequisites

- Node.js 18+
- A Bitbucket Cloud account with API token
- Claude Code installed

### Step 1: Clone and Build

```bash
git clone <this-repo-url>
cd commets-resolver
npm install
npm run build
```

### Step 2: Create a Bitbucket API Token

1. Go to https://bitbucket.org/account/settings/api-tokens/
2. Click **Create API token**
3. Label: `Claude Code MCP`
4. Select these scopes:
   - **Pull requests**: Read, Write
   - **Repositories**: Read
5. Set an expiry date (max 1 year)
6. Copy the generated token (you won't see it again)

### Step 3: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```env
BITBUCKET_EMAIL=you@example.com
BITBUCKET_API_TOKEN=your_api_token
BITBUCKET_WORKSPACE=your-workspace   # optional default workspace
```

### Step 4: Configure Claude Code

Add the MCP server to your project's `.mcp.json` (create it in your project root if it doesn't exist):

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "node",
      "args": ["/absolute/path/to/commets-resolver/dist/index.js"],
      "env": {
        "BITBUCKET_EMAIL": "you@example.com",
        "BITBUCKET_API_TOKEN": "your_api_token",
        "BITBUCKET_WORKSPACE": "your-workspace"
      }
    }
  }
}
```

Replace `/absolute/path/to/` with the actual path where you cloned this repo.

### Step 5: Restart Claude Code

Restart Claude Code or run `/mcp` to check server status. The Bitbucket tools should now be available.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BITBUCKET_EMAIL` | Yes | Your Atlassian account email |
| `BITBUCKET_API_TOKEN` | Yes | Bitbucket API token with required scopes |
| `BITBUCKET_WORKSPACE` | No | Default workspace slug (can be overridden per tool call) |
| `LOG_LEVEL` | No | `debug`, `info` (default), `warn`, `error` |

## Tool Reference

### `bitbucket_list_prs`
Lists open pull requests for a repository.

**Inputs:** `workspace` (optional), `repo_slug`, `state` (optional: `OPEN`, `MERGED`, `DECLINED`)

---

### `bitbucket_get_pr`
Returns full PR details: title, description, author, reviewers, source/destination branches, and status.

**Inputs:** `workspace` (optional), `repo_slug`, `pr_id`

---

### `bitbucket_get_pr_diff`
Returns the raw unified diff of all code changes in a PR.

**Inputs:** `workspace` (optional), `repo_slug`, `pr_id`

---

### `bitbucket_list_pr_comments`
Lists all comments and tasks on a PR. Shows comment IDs, authors, inline file/line references, and task IDs needed for resolution.

**Inputs:** `workspace` (optional), `repo_slug`, `pr_id`, `limit` (default: 100)

---

### `bitbucket_post_pr_comment`
Posts a comment on a PR. Supports both general PR-level comments and inline comments on specific files and lines.

**Inputs:** `workspace` (optional), `repo_slug`, `pr_id`, `message`, `inline` (optional: `{ path, line }`)

---

### `bitbucket_resolve_pr_comment`
Resolves a single task by its task ID. Use `bitbucket_list_pr_comments` first to get the task ID.

**Inputs:** `workspace` (optional), `repo_slug`, `pr_id`, `task_id`

---

### `bitbucket_fetch_and_resolve_pr_comments`
Combined tool: fetches all comments and tasks, then resolves all unresolved tasks in one call. By default shows concise summaries to save tokens. Human and bot comments are separated automatically.

**Inputs:** `workspace` (optional), `repo_slug`, `pr_id`, `verbose` (default: `false`)

**Verbose mode** (`verbose=true`): shows full comment text for all comments including bot comments (e.g. CodeRabbit).

---

## Usage Examples

Once configured, ask Claude Code things like:

- "List open PRs in my-workspace/my-repo"
- "Show me the diff for PR #42 in my-workspace/my-repo"
- "What comments are on PR #42?"
- "Post a comment on PR #42 saying: Looks good, but please add error handling on line 55"
- "Post an inline comment on PR #42, file src/api.ts line 30: this should be null-checked"
- "Resolve task #101 on PR #42"
- "Fetch all comments on PR #42 and resolve all tasks"
- "Review PR #42 — read the diff, list all comments, then resolve any open tasks"

## Multi-Workspace Support

Every tool accepts an optional `workspace` parameter. If omitted, it falls back to `BITBUCKET_WORKSPACE`. This lets you work across multiple workspaces without reconfiguring.

## Development

```bash
npm run dev      # watch mode with tsx
npm run build    # compile TypeScript to dist/
npm run lint     # type-check without emitting
```

## Troubleshooting

**"Authentication failed"** — Check your email and API token. Ensure the token has `pullrequest:read`, `pullrequest:write`, and `repository:read` scopes.

**"Not found"** — Verify the workspace slug, repo slug, and PR ID. The workspace slug is the URL slug (e.g. `my-team` from `bitbucket.org/my-team/`).

**"Permission denied"** — Your API token needs `pullrequest:write` scope to post comments or resolve tasks.

**"Task resolution failed"** — Only the task creator or PR participants with write access can resolve tasks. Verify your token has the correct permissions.

**Server not showing in Claude Code** — Run `/mcp` in Claude Code to check status. Ensure the path in `.mcp.json` is absolute and the `dist/index.js` file exists (run `npm run build` first).

## License

MIT
