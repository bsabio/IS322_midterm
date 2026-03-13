# MCP Skill: github_publisher

## Purpose
Use this skill when an agent needs to create or update repository files through the GitHub REST API in a safe, deterministic way.

## Tool Contract
The tool accepts strict validated input using Zod.

Required fields:
- `owner`: GitHub owner/org
- `repo`: repository name
- `token`: GitHub token with content write permission
- `path`: repository file path
- `content`: raw file content to publish
- `message`: commit message

Optional fields:
- `branch`: defaults to `main`
- `collisionStrategy`: `update` or `timestamp` (defaults to `update`)

## Atomic Commit Rule
Before any PUT request, enforce:
1. `content.trim()` must not be empty.
2. If empty, abort immediately and return an explicit error.

This prevents empty commits and keeps operations atomic and intentional.

## Collision Resolution
When publishing to an existing path, the agent must choose one strategy:

### Strategy A: `update`
1. GET `/repos/{owner}/{repo}/contents/{path}?ref={branch}`
2. If file exists, read `sha`.
3. PUT with the same `path` and include `sha` to perform an update.

### Strategy B: `timestamp`
1. GET the same contents endpoint.
2. If file exists, generate a timestamp suffix and write a new filename.
3. PUT new file without `sha`.

Recommended timestamp format:
- UTC compact: `YYYYMMDDHHmmss`
- Example: `report-20260313040510.md`

## Error Handling Rules
- If GET returns `404`, treat as new file creation path.
- For non-404 GET errors, fail fast and return GitHub response details.
- For PUT failures, return status and body details.
- Never retry blind writes without reevaluating collision state.

## Example Agent Flow
1. Validate input with Zod `.strict()` schema.
2. Enforce non-empty content for atomic commit.
3. Probe existing file SHA via GitHub REST API.
4. Apply configured collision strategy.
5. PUT file content with base64 payload.
6. Return commit SHA, final path, and commit URL.

## Security Notes
- Never log full tokens.
- Keep commit messages explicit and auditable.
- Use least-privilege GitHub tokens.
