import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import { reactbasePrompt } from "./defaults/react";
import { nodebasePrompt } from "./defaults/node";

const app = express();
const port = process.env.PORT || 3000;

// Google GenAI client setup
const apiKey = process.env["GEMINI_API_KEY"] || "";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

app.use(cors());
app.use(express.json());

async function callGemini(messages: { role: string; content: string }[]) {
  // Combine messages into a single string
  const content = messages.map(m => `${m.role === "user" ? "User" : "System"}: ${m.content}`).join("\n");

  const result = await model.generateContent(content);
  const response = await result.response;
  const text = response.text();

  return text.trim();
}

// POST /template
app.post("/template", async (req: any, res: any) => {
  const prompt = req.body.prompt;

  try {
    const answer = await callGemini([
      {
        role: "system",
        content:
          "Only answer with one word: 'react' or 'node' based on the following project description. Do not return anything extra.",
      },
      { role: "user", content: prompt },
    ]);

    console.log("Answer from Gemini:", answer);

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

    res.status(403).json({ msg: "Unexpected response format: " + answer });
  } catch (error) {
    console.error("Error in /template:", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

// POST /chat
app.post("/chat", async (req: any, res: any) => {
  const messages = req.body.messages;

  try {
    const answer = await callGemini([
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
  console.log("Server running on port", port);
});
