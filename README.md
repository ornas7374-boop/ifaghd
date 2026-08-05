# ifaghd

## n8n-mcp

This project is configured to use [n8n-mcp](https://github.com/czlonkowski/n8n-mcp), a Model Context Protocol server that gives AI assistants structured access to n8n's nodes, documentation, and workflow validation tools.

The server is registered in [`.mcp.json`](.mcp.json) and runs via `npx n8n-mcp`, so no separate install step is required — Claude Code (or any MCP-compatible client) will fetch and launch it automatically.

By default it runs in **docs-only mode**: node search, documentation lookup, and workflow validation tools work out of the box with no n8n instance required.

To enable the additional tools that create/deploy workflows against a live n8n instance, add your credentials to the `env` block in `.mcp.json`:

```json
"env": {
  "MCP_MODE": "stdio",
  "LOG_LEVEL": "error",
  "DISABLE_CONSOLE_OUTPUT": "true",
  "N8N_API_URL": "https://your-n8n-instance.com",
  "N8N_API_KEY": "your-api-key"
}
```

After editing, restart your MCP client (or run `/mcp` in Claude Code) to pick up the change.
