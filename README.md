# bitbucket-cloud-mcp-server

A TypeScript-based MCP (Model Context Protocol) server for interacting with the Bitbucket Cloud API, providing tools to manage pull requests and comments.

## Features

| Tool | Description |
|---|---|
| `bitbucket_list_prs` | List pull requests for a repository |
| `bitbucket_get_pr` | Get full details of a single PR |
| `bitbucket_get_pr_diff` | Get the code diff for a PR |
| `bitbucket_list_pr_comments` | List all comments on a PR |
| `bitbucket_post_pr_comment` | Post general or inline comments on a PR |

## Setup Guide

### Prerequisites

- Node.js 18+
- A Bitbucket Cloud account
- Claude Code installed

### Step 1: Clone and Build

```bash
git clone <this-repo-url>
cd bitbucket-cloud-mcp
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
6. Copy the generated token (you won't be able to see it again)

### Step 3: Configure Claude Code

Add the MCP server to your project's `.mcp.json` (create it in your project root if it doesn't exist):

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "node",
      "args": ["/absolute/path/to/bitbucket-cloud-mcp/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/` with the actual path where you cloned the repo.

`BITBUCKET_WORKSPACE` is optional - you can specify it per tool call instead.

### Step 4: Restart Claude Code

Restart Claude Code (or run `/mcp` to check server status). The Bitbucket tools should now be available.

## Usage Examples

Once configured, you can ask Claude Code things like:

- "List open PRs in my-workspace/my-repo"
- "Show me the diff for PR #42 in my-workspace/my-repo"
- "What comments are on PR #42?"
- "Post a comment on PR #42 saying: Looks good, but please add error handling on line 55"
- "Review PR #42 - read the diff and post your review as comments"

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BITBUCKET_EMAIL` | Yes | Your Atlassian account email |
| `BITBUCKET_API_TOKEN` | Yes | Bitbucket API token (with scopes) |
| `BITBUCKET_WORKSPACE` | No | Default workspace slug |
| `LOG_LEVEL` | No | `debug`, `info` (default), `warn`, `error` |

## Multi-Workspace Support

Every tool accepts an optional `workspace` parameter. If not provided, it falls back to `BITBUCKET_WORKSPACE`. This means you can work across multiple workspaces without reconfiguring.

## Troubleshooting

**"Authentication failed"** - Check your email and API token. Make sure the token has the required scopes (pullrequest read/write, repository read).

**"Not found"** - Verify the workspace slug, repo slug, and PR ID. Workspace slug is the URL slug (e.g., `my-team` from `bitbucket.org/my-team/`).

**"Permission denied"** - Your API token needs `pullrequest:write` scope to post comments.

**Server not showing in Claude Code** - Run `/mcp` in Claude Code to check status. Ensure the path in `.mcp.json` is absolute and correct.
