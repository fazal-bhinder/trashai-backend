require("dotenv").config(); 
import OpenAI from "openai";
import 'dotenv/config';
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import express from "express";
import { reactbasePrompt } from "./defaults/react";
import { nodebasePrompt } from "./defaults/node";
import cors from "cors";

const app = express();
const token = process.env["OPENAI_API_KEY"];
const endpoint = "https://models.inference.ai.azure.com";
app.use(cors())
app.use(express.json());

app.post("/template", async (req  , res) => {
     const prompt = req.body.prompt;

     const client = new OpenAI({
      baseURL: endpoint,
      apiKey: token
    });
  
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "Only answer with one word: 'react' or 'node' based on the following project description.Do not return anything extra" },
        { role:"user", content: prompt },
      ],
      model: "gpt-4.1-mini",
      temperature: 1,
      max_tokens: 100,
      top_p: 1,
    });

    const answer = (response.choices[0]?.message as { content: string })?.content?.trim();

    if (answer === "react"){
      res.json({
        prompts : [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactbasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
        uiPrompts: [reactbasePrompt]
      })
      return;
    }

    if (answer === "node"){
      res.json({
        prompts : [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodebasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
        uiPrompts: [nodebasePrompt]
      })
      return;
    }

    res.status(403).json({
      msg : "Error in the server"
    })
    return;

});


// chat route
app.post("/chat", async (req, res) => {
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

    res.json({
      response: answer,
    });
    return;
  } catch (error) {
    console.error("Error in /chat:", error);
    res.status(500).json({
      msg: "Internal Server Error"
    });
    return;
  }
});

// Start server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
