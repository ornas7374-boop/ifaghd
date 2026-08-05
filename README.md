# ifaghd

## n8n-mcp

This project is configured to use [n8n-mcp](https://github.com/czlonkowski/n8n-mcp), a Model Context Protocol server that gives AI assistants structured access to n8n's nodes, documentation, and workflow validation tools.

The server is registered in [`.mcp.json`](.mcp.json) and runs via `npx n8n-mcp`, so no separate install step is required — Claude Code (or any MCP-compatible client) will fetch and launch it automatically.

By default it runs in **docs-only mode**: node search, documentation lookup, and workflow validation tools work out of the box with no n8n instance required.

To enable the additional tools that create/deploy workflows against a live n8n instance, `.mcp.json` reads `N8N_API_URL` and `N8N_API_KEY` from your environment (`${N8N_API_URL}` / `${N8N_API_KEY}`) rather than hardcoding them, since this repository is public and these are sensitive credentials.

1. Copy `.env` (already present locally, git-ignored) or create your own with:
   ```
   N8N_API_URL=https://your-n8n-instance.com
   N8N_API_KEY=your-api-key
   ```
2. Load it into your shell before starting your MCP client, e.g.:
   ```bash
   set -a && source .env && set +a
   ```
3. Restart your MCP client (or run `/mcp` in Claude Code) to pick up the change.

**Never commit `.env`** — it's listed in `.gitignore` for exactly this reason. If this repository is ever made private, credentials can instead be hardcoded directly in `.mcp.json` if preferred.
