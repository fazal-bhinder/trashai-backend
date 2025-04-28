require("dotenv").config();
import OpenAI from "openai";
import 'dotenv/config';
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import express, { Request, Response } from "express";
import { reactbasePrompt } from "./defaults/react";
import { nodebasePrompt } from "./defaults/node";
import cors from "cors";

const app = express();
const token = process.env["OPENAI_API_KEY"];
const endpoint = "https://models.inference.ai.azure.com";

app.use(cors({
  origin: "https://vercel.com/fazal-bhinders-projects/trashai-frontend", 
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// /template route
app.post("/template", async (req: Request, res: Response) => {
  const prompt = req.body.prompt;

  const client = new OpenAI({
    baseURL: endpoint,
    apiKey: token
  });

  const response = await client.chat.completions.create({
    messages: [
      { role: "system", content: "Only answer with one word: 'react' or 'node' based on the following project description. Do not return anything extra." },
      { role: "user", content: prompt },
    ],
    model: "gpt-4.1-mini",
    temperature: 1,
    max_tokens: 100,
    top_p: 1,
  });

  const answer = (response.choices[0]?.message as { content: string })?.content?.trim();

  if (answer === "react") {
    res.json({
      prompts: [BASE_PROMPT, `Here is an artifact...${reactbasePrompt}`],
      uiPrompts: [reactbasePrompt]
    });
    return;
  }

  if (answer === "node") {
    res.json({
      prompts: [`Here is an artifact...${nodebasePrompt}`],
      uiPrompts: [nodebasePrompt]
    });
    return;
  }

  res.status(403).json({ msg: "Error in the server" });
});

// /chat route
app.post("/chat", async (req: Request, res: Response) => {
  const messages = req.body.messages;

  const client = new OpenAI({
    baseURL: endpoint,
    apiKey: token
  });

  try {
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: getSystemPrompt() },
        ...messages,
      ],
      model: "gpt-4.1-mini",
      temperature: 0.8,
      max_tokens: 2048,
      top_p: 0.1
    });

    const answer = (response.choices[0]?.message as { content: string })?.content?.trim();

    res.json({ response: answer });
  } catch (error) {
    console.error("Error in /chat:", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});


export default app;
