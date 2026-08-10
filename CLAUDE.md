# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

This repository currently contains no application code. Its sole content is an MCP (Model Context Protocol) server configuration that wires up [n8n-mcp](https://github.com/czlonkowski/n8n-mcp), giving AI assistants structured access to n8n's nodes, documentation, and workflow validation/deployment tools.

## Structure

- `.mcp.json` — registers the `n8n-mcp` server, launched via `npx n8n-mcp` (no separate install step needed). Runs in stdio mode with console output disabled.
- `README.md` — setup instructions for the n8n-mcp server (reproduced below).
- `.gitignore` — ignores `.env`.

## n8n-mcp server

By default `n8n-mcp` runs in **docs-only mode**: node search, documentation lookup, and workflow validation tools work with no n8n instance required.

To enable the additional tools that create/deploy workflows against a live n8n instance, `.mcp.json` reads `N8N_API_URL` and `N8N_API_KEY` from the environment (`${N8N_API_URL}` / `${N8N_API_KEY}`) rather than hardcoding them, since this repository is public and these are sensitive credentials.

To enable live-instance tools:
1. Create a `.env` file (git-ignored) with:
   ```
   N8N_API_URL=https://your-n8n-instance.com
   N8N_API_KEY=your-api-key
   ```
2. Load it into the shell before starting the MCP client:
   ```bash
   set -a && source .env && set +a
   ```
3. Restart the MCP client (or run `/mcp` in Claude Code) to pick up the change.

**Never commit `.env`.** If this repository is ever made private, credentials can instead be hardcoded directly in `.mcp.json`.
