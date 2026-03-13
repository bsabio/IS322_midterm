import { NextResponse } from "next/server";
import { z } from "zod";
import { publishCourseModuleFromTranscript } from "../../../src/mcp/course-module-publisher";

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
  });
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
    const result = await publishCourseModuleFromTranscript({
      transcript: body.transcript,
      owner,
      repo,
      token,
      branch,
      collisionStrategy: body.collisionStrategy || "timestamp",
      commitMessage:
        body.commitMessage ||
        "Publish instructional course module from transcript via /api/builder",
    });

    return NextResponse.json({
      ok: true,
      status: "published",
      title: result.title,
      topicFolder: result.topicFolder,
      slug: result.slug,
      finalPath: result.finalPath,
      retriesUsed: result.retriesUsed,
      commit: {
        sha: result.publish.commitSha,
        url: result.publish.htmlUrl,
        action: result.publish.action,
      },
      htmlPreview: result.html.slice(0, 1500),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        error: message,
      },
      { status: 502 },
    );
  }
}
