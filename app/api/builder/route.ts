import { NextResponse } from "next/server";
import { z } from "zod";
import { githubPublisherTool } from "../../../src/mcp/github-tool";

export const runtime = "nodejs";

const BuilderRequestSchema = z
  .object({
    transcript: z.string().min(1, "transcript is required"),
    owner: z.string().optional(),
    repo: z.string().optional(),
    token: z.string().optional(),
    branch: z.string().optional(),
    collisionStrategy: z.enum(["update", "timestamp"]).optional(),
    commitMessage: z.string().optional(),
  })
  .strict();

const OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3";
const COURSE_SYSTEM_INSTRUCTION =
  "Convert this transcript into a structured Markdown course with a Title, TL;DR, and Quiz.";

type OllamaGenerateResponse = {
  response?: string;
  error?: string;
};

function missingFieldError(name: string): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: `Missing required field: ${name}`,
      hint: `Send ${name} in the request body or set env var ${name.toUpperCase()}`,
    },
    { status: 400 },
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/builder",
    method: "POST",
    requiredBody: ["transcript"],
    optionalBody: [
      "owner",
      "repo",
      "token",
      "branch",
      "collisionStrategy",
      "commitMessage",
    ],
    envFallbacks: ["GITHUB_OWNER", "GITHUB_REPO", "GITHUB_TOKEN", "GITHUB_BRANCH"],
    llm: {
      provider: "ollama",
      endpoint: OLLAMA_GENERATE_URL,
      model: OLLAMA_MODEL,
      stream: false,
    },
  });
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || "course-module";
}

function deriveTitleFromMarkdown(markdown: string): string {
  const firstHeading = markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "));

  if (firstHeading) {
    return firstHeading.replace(/^#\s+/, "").trim() || "Course Module";
  }

  return "Course Module";
}

async function callLocalLLM(prompt: string): Promise<string> {
  try {
    const response = await fetch(OLLAMA_GENERATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        system: COURSE_SYSTEM_INSTRUCTION,
        prompt,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${details}`);
    }

    const payload = (await response.json()) as OllamaGenerateResponse;
    if (payload.error) {
      throw new Error(`Ollama error: ${payload.error}`);
    }

    const markdown = (payload.response || "").trim();
    if (!markdown) {
      throw new Error("Ollama returned an empty response.");
    }

    return markdown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("ECONNREFUSED") ||
      message.includes("fetch failed") ||
      message.includes("ENOTFOUND")
    ) {
      throw new Error(
        "Could not reach Ollama at http://localhost:11434. Make sure Ollama is running (for example: `ollama serve`) and that model `llama3` is installed.",
      );
    }

    throw error;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  let jsonBody: unknown;

  try {
    jsonBody = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = BuilderRequestSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const owner = body.owner || process.env.GITHUB_OWNER;
  const repo = body.repo || process.env.GITHUB_REPO;
  const token = body.token || process.env.GITHUB_TOKEN;
  const branch = body.branch || process.env.GITHUB_BRANCH || "main";

  if (!owner) return missingFieldError("owner");
  if (!repo) return missingFieldError("repo");
  if (!token) return missingFieldError("token");

  try {
    const llmPrompt = [
      "Create a clean, structured Markdown course from the transcript below.",
      "Required sections:",
      "1) # Title",
      "2) TL;DR (bullet list)",
      "3) Quiz (at least 5 questions with answers)",
      "",
      "Transcript:",
      body.transcript,
    ].join("\n");

    const markdown = await callLocalLLM(llmPrompt);
    const title = deriveTitleFromMarkdown(markdown);
    const slug = slugify(title);
    const publishPath = `course-modules/ai-generated/${slug}.md`;

    const publish = await githubPublisherTool({
      owner,
      repo,
      token,
      branch,
      path: publishPath,
      content: markdown,
      collisionStrategy: body.collisionStrategy || "timestamp",
      message:
        body.commitMessage ||
        "Publish Markdown course module from transcript via /api/builder",
    });

    return NextResponse.json({
      ok: true,
      status: "published",
      title,
      slug,
      finalPath: publish.finalPath,
      commit: {
        sha: publish.commitSha,
        url: publish.htmlUrl,
        action: publish.action,
      },
      markdownPreview: markdown.slice(0, 1500),
      llm: {
        provider: "ollama",
        model: OLLAMA_MODEL,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = message.includes("Could not reach Ollama") ? 503 : 502;
    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        error: message,
      },
      { status: statusCode },
    );
  }
}
