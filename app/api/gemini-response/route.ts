// app/api/gemini-response/route.ts
import { GoogleGenAI } from "@google/genai";
import fs from 'node:fs';

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
const chat = genAI.chats.create({
  model: "gemini-2.5-flash",
  config: {
    temperature: 0,
    systemInstruction: getSystemPrompt(level)
  }
});

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
          const response = await chat.sendMessageStream({
            message: prompt
          });

          for await (const chunk of response) {
            const piece = chunk.text;
            if (piece) {
              controller.enqueue(new TextEncoder().encode(piece));
            }
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
