import { stepCountIs, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT } from "./prompts";
import {
  getFileChangesInDirectoryTool,
  generateCommitMessageTool,
  generateMarkdownReportTool,
} from "./tools";

const codeReviewAgent = async (prompt: string) => {
  const result = streamText({
    model: google("models/gemini-2.5-flash"),
    prompt,
    system: SYSTEM_PROMPT,
    tools: {
      getFileChangesInDirectoryTool,
      generateCommitMessageTool,
      generateMarkdownReportTool,
    },
    stopWhen: stepCountIs(30), // more steps for multi-tool workflow
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
};

// Full prompt guiding the agent to use tools
const fullPrompt = `
You are a code review assistant.

1. Use getFileChangesInDirectoryTool to get code diffs in the './' directory.
2. Review each file's code changes and provide feedback.
3. Use generateCommitMessageTool to produce a concise commit message summarizing the changes.
4. Use generateMarkdownReportTool to generate a markdown report of your review feedback.
5. Return the review, commit message, and markdown report in that order.

Begin.
`;

await codeReviewAgent(fullPrompt);
