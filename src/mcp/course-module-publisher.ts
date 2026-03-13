import { z } from "zod";
import {
  githubPublisherTool,
  type GitHubPublisherInput,
  type GitHubPublisherResult,
} from "./github-tool";

const CourseModuleInputSchema = z
  .object({
    transcript: z.string().min(1, "transcript is required"),
    owner: z.string().min(1, "owner is required"),
    repo: z.string().min(1, "repo is required"),
    token: z.string().min(1, "token is required"),
    branch: z.string().min(1).default("main"),
    collisionStrategy: z.enum(["update", "timestamp"]).default("timestamp"),
    commitMessage: z.string().min(1).default("Publish instructional course module"),
  })
  .strict();

export type CourseModulePublisherInput = z.infer<typeof CourseModuleInputSchema>;

export type CourseModulePublisherResult = {
  title: string;
  topicFolder: string;
  slug: string;
  finalPath: string;
  html: string;
  publish: GitHubPublisherResult;
  retriesUsed: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitSentences(transcript: string): string[] {
  const compact = transcript.replace(/\s+/g, " ").trim();
  if (!compact) return [];

  return compact
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function deriveTitle(transcript: string): string {
  const sentences = splitSentences(transcript);
  const first = sentences[0] ?? transcript;
  const cleaned = first
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean).slice(0, 8);
  const raw = words.join(" ").trim();

  if (!raw) {
    return "Course Module";
  }

  return raw
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function chooseTopicFolder(transcript: string): string {
  const text = transcript.toLowerCase();

  const topicRules: Array<{ folder: string; terms: string[] }> = [
    { folder: "devops", terms: ["devops", "ci/cd", "pipeline", "kubernetes", "docker", "terraform"] },
    { folder: "software-engineering", terms: ["api", "microservice", "architecture", "refactor", "typescript", "javascript"] },
    { folder: "data-ai", terms: ["machine learning", "llm", "prompt", "neural", "model", "dataset"] },
    { folder: "security", terms: ["security", "auth", "oauth", "threat", "encryption", "vulnerability"] },
    { folder: "product-management", terms: ["roadmap", "stakeholder", "mvp", "kpi", "strategy", "prioritization"] },
  ];

  for (const rule of topicRules) {
    if (rule.terms.some((term) => text.includes(term))) {
      return rule.folder;
    }
  }

  return "general";
}

function toBulletPoints(transcript: string, maxPoints: number): string[] {
  const sentences = splitSentences(transcript);
  if (!sentences.length) {
    return ["No transcript details were provided."];
  }

  return sentences.slice(0, maxPoints).map((sentence) => {
    const cleaned = sentence.replace(/\s+/g, " ").trim();
    return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
  });
}

function buildQuizQuestions(points: string[]): string[] {
  const seed = points.length ? points : ["The module focuses on core ideas from the transcript."];

  const templates = [
    `What is the primary focus of this module?\nA) ${seed[0]}\nB) Unrelated historical context\nC) Random tooling without context\nD) A non-technical biography`,
    `Which action best reflects the detailed breakdown?\nA) Ignore the core process\nB) Apply the steps described in the module\nC) Remove all constraints\nD) Skip validation`,
    `Why is the TL;DR section useful?\nA) It replaces all implementation details\nB) It provides a quick high-level summary before deeper study\nC) It stores API tokens\nD) It disables assessment`,
    `How should a learner use this module?\nA) Read only the quiz\nB) Review the TL;DR, then follow the breakdown sequentially\nC) Skip the transcript context\nD) Memorize without practice`,
    `What demonstrates successful understanding after this module?\nA) Inability to explain the topic\nB) Applying at least one concept from the breakdown in practice\nC) Avoiding all feedback\nD) Deleting notes immediately`,
  ];

  return templates;
}

function buildHtmlCourseModule(transcript: string): { title: string; html: string } {
  const title = deriveTitle(transcript);
  const tldrPoints = toBulletPoints(transcript, 3);
  const detailPoints = toBulletPoints(transcript, 8);
  const quizQuestions = buildQuizQuestions(detailPoints);

  const escapedTitle = escapeHtml(title);
  const escapedTranscript = escapeHtml(transcript.trim());

  const tldrHtml = tldrPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("\n");
  const detailHtml = detailPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("\n");
  const quizHtml = quizQuestions
    .map(
      (question, index) =>
        `<details><summary>Question ${index + 1}</summary><pre>${escapeHtml(question)}</pre></details>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <style>
    body { font-family: "Segoe UI", Tahoma, sans-serif; margin: 0; color: #0f172a; background: #f8fafc; }
    main { max-width: 900px; margin: 0 auto; padding: 2rem 1rem 3rem; }
    h1 { margin-bottom: 0.25rem; }
    .muted { color: #334155; }
    section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; margin-top: 1rem; }
    ul { line-height: 1.6; }
    details { margin-top: 0.7rem; }
    pre { white-space: pre-wrap; background: #f1f5f9; padding: 0.7rem; border-radius: 8px; }
  </style>
</head>
<body>
  <main>
    <h1>${escapedTitle}</h1>
    <p class="muted">Professionally formatted course module generated from transcript input.</p>

    <section>
      <h2>TL;DR</h2>
      <ul>
        ${tldrHtml}
      </ul>
    </section>

    <section>
      <h2>Detailed Breakdown</h2>
      <ul>
        ${detailHtml}
      </ul>
    </section>

    <section>
      <h2>Interactive Quiz (5 Questions)</h2>
      ${quizHtml}
    </section>

    <section>
      <h2>Original Transcript</h2>
      <pre>${escapedTranscript}</pre>
    </section>
  </main>
</body>
</html>`;

  return { title, html };
}

function buildPath(topicFolder: string, title: string): { slug: string; path: string } {
  const slug = slugify(title);
  const path = `course-modules/${topicFolder}/${slug}.html`;
  return { slug, path };
}

function buildPublishPayload(input: CourseModulePublisherInput, path: string, html: string): GitHubPublisherInput {
  return {
    owner: input.owner,
    repo: input.repo,
    token: input.token,
    branch: input.branch,
    path,
    content: html,
    message: input.commitMessage,
    collisionStrategy: input.collisionStrategy,
  };
}

/**
 * End-to-end transcript publisher.
 * 1) Generates a structured course module HTML.
 * 2) Chooses topic folder and slugified filename.
 * 3) Publishes via github_publisher with one retry after payload debugging.
 */
export async function publishCourseModuleFromTranscript(
  rawInput: unknown,
): Promise<CourseModulePublisherResult> {
  const input = CourseModuleInputSchema.parse(rawInput);
  const { title, html } = buildHtmlCourseModule(input.transcript);
  const topicFolder = chooseTopicFolder(input.transcript);
  const { slug, path } = buildPath(topicFolder, title);

  let retriesUsed = 0;
  let publishPayload = buildPublishPayload(input, path, html);

  try {
    const publish = await githubPublisherTool(publishPayload);
    return {
      title,
      topicFolder,
      slug,
      finalPath: publish.finalPath,
      html,
      publish,
      retriesUsed,
    };
  } catch (firstError) {
    retriesUsed = 1;

    // Retry once with a debugged payload: force timestamp strategy and a fresh timestamped filename.
    const timestampedSlug = `${slug}-${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
    const retryPath = `course-modules/${topicFolder}/${timestampedSlug}.html`;
    publishPayload = {
      ...publishPayload,
      collisionStrategy: "timestamp",
      path: retryPath,
    };

    try {
      const publish = await githubPublisherTool(publishPayload);
      return {
        title,
        topicFolder,
        slug: timestampedSlug,
        finalPath: publish.finalPath,
        html,
        publish,
        retriesUsed,
      };
    } catch (secondError) {
      const firstMessage = firstError instanceof Error ? firstError.message : String(firstError);
      const secondMessage = secondError instanceof Error ? secondError.message : String(secondError);
      throw new Error(
        `Publish failed after one retry. First error: ${firstMessage}. Retry error: ${secondMessage}`,
      );
    }
  }
}
