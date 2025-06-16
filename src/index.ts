import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import { reactbasePrompt } from "./defaults/react";
import { nodebasePrompt } from "./defaults/node";

const app = express();
const apiKey = process.env["OPENROUTER_API_KEY"] || "";
const model = "deepseek/deepseek-r1-0528";
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper to make OpenRouter requests
async function callOpenRouter(messages: any[]) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      max_tokens: 8000
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorBody}`);
  }

  const data = await response.json() as {
    choices: { message?: { content?: string } }[];
  };
  return data.choices[0]?.message?.content?.trim();
}

// POST /template
app.post("/template", async (req: any, res: any) => {
  const prompt = req.body.prompt;

  try {
    const answer = await callOpenRouter([
      {
        role: "system",
        content:
          "Only answer with one word: 'react' or 'node' based on the following project description. Do not return anything extra.",
      },
      { role: "user", content: prompt },
    ]);

    console.log("Answer from OpenRouter:", answer);

    if (answer === "react") {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactbasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactbasePrompt],
      });
      return;
    }

    if (answer === "node") {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodebasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodebasePrompt],
      });
      return;
    }

    res.status(403).json({ msg: "Unexpected response format" });
  } catch (error) {
    console.error("Error in /template:", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

// POST /chat
app.post("/chat", async (req: any, res: any) => {
  const messages = req.body.messages;

  try {
    const answer = await callOpenRouter([
      { role: "system", content: getSystemPrompt() },
      ...messages,
    ]);

    res.json({ response: answer });
  } catch (error) {
    console.error("Error in /chat:", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

// Start server
app.listen(port, () => {
  console.log("Server running on port ", port);
});
