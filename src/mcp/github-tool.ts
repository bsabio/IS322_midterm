import { z } from "zod";

const GitHubPublisherInputSchema = z
  .object({
    owner: z.string().min(1, "owner is required"),
    repo: z.string().min(1, "repo is required"),
    token: z.string().min(1, "token is required"),
    path: z.string().min(1, "path is required"),
    content: z.string().min(1, "content must not be empty"),
    message: z.string().min(1, "commit message is required"),
    branch: z.string().min(1).default("main"),
    collisionStrategy: z.enum(["timestamp", "update"]).default("update"),
  })
  .strict();

export type GitHubPublisherInput = z.infer<typeof GitHubPublisherInputSchema>;

export type GitHubPublisherResult = {
  success: boolean;
  action: "created" | "updated";
  finalPath: string;
  commitSha: string;
  htmlUrl: string;
};

type GitHubContentResponse = {
  sha: string;
  path: string;
};

function encodeGitHubPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i] ?? 0;
    const b2 = bytes[i + 1] ?? 0;
    const b3 = bytes[i + 2] ?? 0;
    const triple = (b1 << 16) | (b2 << 8) | b3;

    output += alphabet[(triple >> 18) & 0x3f];
    output += alphabet[(triple >> 12) & 0x3f];
    output += i + 1 < bytes.length ? alphabet[(triple >> 6) & 0x3f] : "=";
    output += i + 2 < bytes.length ? alphabet[triple & 0x3f] : "=";
  }

  return output;
}

function toBase64(value: string): string {
  if (typeof TextEncoder === "undefined") {
    throw new Error("No TextEncoder is available in this runtime");
  }

  const bytes = new TextEncoder().encode(value);
  return bytesToBase64(bytes);
}

function appendTimestamp(path: string): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const dotIndex = path.lastIndexOf(".");

  if (dotIndex <= 0) {
    return `${path}-${stamp}`;
  }

  const base = path.slice(0, dotIndex);
  const ext = path.slice(dotIndex);
  return `${base}-${stamp}${ext}`;
}

async function fetchExistingFileSha(args: {
  owner: string;
  repo: string;
  path: string;
  token: string;
  branch: string;
}): Promise<string | null> {
  const { owner, repo, path, token, branch } = args;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(branch)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub lookup failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as GitHubContentResponse;
  return data.sha;
}

async function putFile(args: {
  owner: string;
  repo: string;
  path: string;
  token: string;
  branch: string;
  message: string;
  content: string;
  sha?: string;
}): Promise<GitHubPublisherResult> {
  const { owner, repo, path, token, branch, message, content, sha } = args;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeGitHubPath(path)}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: toBase64(content),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub write failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as {
    content: { path: string };
    commit: { sha: string; html_url: string };
  };

  return {
    success: true,
    action: sha ? "updated" : "created",
    finalPath: payload.content.path,
    commitSha: payload.commit.sha,
    htmlUrl: payload.commit.html_url,
  };
}

/**
 * GitHub publisher MCP tool logic.
 * - Uses strict Zod validation.
 * - Enforces atomic commit rule by rejecting empty content before remote calls.
 * - Resolves collisions by either updating existing file with SHA or writing a timestamped filename.
 */
export async function githubPublisherTool(rawInput: unknown): Promise<GitHubPublisherResult> {
  const input = GitHubPublisherInputSchema.parse(rawInput);

  const trimmed = input.content.trim();
  if (!trimmed) {
    throw new Error("Atomic commit rejected: content is empty after trimming.");
  }

  const existingSha = await fetchExistingFileSha({
    owner: input.owner,
    repo: input.repo,
    path: input.path,
    token: input.token,
    branch: input.branch,
  });

  if (!existingSha) {
    return putFile({
      owner: input.owner,
      repo: input.repo,
      path: input.path,
      token: input.token,
      branch: input.branch,
      message: input.message,
      content: trimmed,
    });
  }

  if (input.collisionStrategy === "timestamp") {
    const timestampedPath = appendTimestamp(input.path);
    return putFile({
      owner: input.owner,
      repo: input.repo,
      path: timestampedPath,
      token: input.token,
      branch: input.branch,
      message: input.message,
      content: trimmed,
    });
  }

  return putFile({
    owner: input.owner,
    repo: input.repo,
    path: input.path,
    token: input.token,
    branch: input.branch,
    message: input.message,
    content: trimmed,
    sha: existingSha,
  });
}
