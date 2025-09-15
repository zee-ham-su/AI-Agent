import { tool } from "ai";
import { simpleGit } from "simple-git";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

const excludeFiles = ["dist", "bun.lock"];

const fileChange = z.object({
  rootDir: z.string().min(1).describe("The root directory"),
});

type FileChange = z.infer<typeof fileChange>;

async function getFileChangesInDirectory({ rootDir }: FileChange) {
  const git = simpleGit(rootDir);
  const summary = await git.diffSummary();
  const diffs: { file: string; diff: string }[] = [];

  for (const file of summary.files) {
    if (excludeFiles.includes(file.file)) continue;
    const diff = await git.diff(["--", file.file]);
    diffs.push({ file: file.file, diff });
  }

  return diffs;
}

export const getFileChangesInDirectoryTool = tool({
  description: "Gets the code changes made in given directory",
  inputSchema: fileChange,
  execute: getFileChangesInDirectory,
});

// -------------------- New Tools with LLM integration ---------------------

const commitMessageInput = z.object({
  diffs: z.array(z.object({
    file: z.string(),
    diff: z.string(),
  })),
});

type CommitMessageInput = z.infer<typeof commitMessageInput>;

async function generateCommitMessage({ diffs }: CommitMessageInput) {
  const diffSummary = diffs
    .map(({ file, diff }) => `File: ${file}\nDiff:\n${diff.substring(0, 500)}\n---`) // limit diff size for prompt
    .join("\n");

  const prompt = `Generate a concise, meaningful git commit message based on the following code changes:\n\n${diffSummary}\n\nCommit message:`;

  const result = streamText({
    model: google("models/gemini-2.5-flash"),
    prompt,
    stopWhen: (step) => step >= 1,
  });

  let message = "";
  for await (const chunk of result.textStream) {
    message += chunk;
  }

  return message.trim();
}

export const generateCommitMessageTool = tool({
  description: "Generates a concise commit message based on code diffs using LLM",
  inputSchema: commitMessageInput,
  execute: generateCommitMessage,
});

const markdownReportInput = z.object({
  content: z.string().min(1).describe("Content to include in the markdown report"),
});

type MarkdownReportInput = z.infer<typeof markdownReportInput>;

async function generateMarkdownReport({ content }: MarkdownReportInput) {
  const prompt = `Generate a detailed markdown report summarizing the following code review feedback:\n\n${content}\n\nMarkdown report:`;

  const result = streamText({
    model: google("models/gemini-2.5-flash"),
    prompt,
    stopWhen: (step) => step >= 1,
  });

  let markdown = "";
  for await (const chunk of result.textStream) {
    markdown += chunk;
  }

  return markdown.trim();
}

export const generateMarkdownReportTool = tool({
  description: "Generates a markdown report from provided content using LLM",
  inputSchema: markdownReportInput,
  execute: generateMarkdownReport,
});
