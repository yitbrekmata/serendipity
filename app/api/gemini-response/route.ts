// app/api/gemini-response/route.ts
import { GoogleGenAI } from "@google/genai";
import fs from 'node:fs';

// RAG Imports

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// FIXME: this code is unsafe, could error and crash the program

function getSystemPrompt(level: number) {
  if (level < 1 || level > 3) level = 1;      // idk if this should be kept?
  const levelprompt = fs.readFileSync('app/level' + level + '.txt', 'utf8');
  return data.replace("SUBSTITUTE HERE", levelprompt);
}

const data = fs.readFileSync('app/sys-prompt.txt', 'utf8');
let level = 1;
const apiKey = process.env.GEMINI_API;
const genAI = new GoogleGenAI({apiKey : apiKey});
let chat = genAI.chats.create({
  model: "gemini-2.5-flash",
  config: {
    temperature: 0,
    systemInstruction: getSystemPrompt(level)
  }
});

// RAG initialization

const lore = fs.readFileSync('app/lore.txt', 'utf-8');
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 300, chunkOverlap: 30 });
const chunks = await splitter.splitText(lore);
const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey, model: "models/gemini-embedding-001" });
const vectorStore = await MemoryVectorStore.fromTexts(chunks, {}, embeddings);

// System prompt handling

function switchSystemPrompt(new_level: number) {
  level = new_level;
  chat = genAI.chats.create({
    model: "gemini-2.5-flash",
    history: chat.getHistory(),     // curated vs comprehensive histories?
    config: {
      temperature: 0,
      systemInstruction: getSystemPrompt(level) 
    }
  });
}

let tally = 9;

let hat = [25, 30, 24, 23, 35, 5, 30, 34, 22, 10];

function processSerendipity(response: string | undefined) {
  if (response == undefined) return undefined;

  console.log(response);

  response = response.replace(/RANDOM_NUMBER_REQUEST\(\s*(\d*?)\s*\,\s*(\d*?)\s*\)/g, function(m, a, b) {
    const lowerBound = Number(a);
    const upperBound = Number(b);
    if (lowerBound == 1 && upperBound == 42) {
      tally = (tally + 1) % 10;
        if (tally == 9 && level == 2) {
          switchSystemPrompt(3);
        }
        return '' + hat[tally];
    } else {
      return '' + (Math.floor(Math.random() * (upperBound - lowerBound)) + lowerBound)
    }
  })

  if (response.toLowerCase().includes("providence")) {
    // Switch to level 2 as well
    let box = new RegExp("PROVIDENCE", 'gi');
    response = response.replace(box, "██████████");
    if (level == 1) {
      switchSystemPrompt(2);
    }
  }
  return response;
}

export async function POST(request: Request) {

  try {
    const { prompt } = await request.json();

    //const apiKey = process.env.GEMINI_API;
    if (!apiKey) {
      return new Response("Missing GEMINI_API_KEY", { status: 500 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // RAG
          const docs = await vectorStore.similaritySearch(prompt, 5);
          const context = docs.map(d => d.pageContent).join("\n");
          const response = await chat.sendMessage({
            message: `Context:\n${context}\n\nUser Query:\n${prompt}`
          });

          const piece = response.text
          if (piece) {
            const resSeren = '' + processSerendipity(piece);
            controller.enqueue(new TextEncoder().encode(resSeren));
          }

          controller.close();
        } catch (err) {
          controller.enqueue(
            new TextEncoder().encode(`Error: ${String(err)}`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Route error:", err);
    return new Response(`Error: ${String(err)}`, { status: 500 });
  }
  
}