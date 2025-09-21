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
let chat = genAI.chats.create({
  model: "gemini-2.5-flash",
  config: {
    temperature: 0,
    systemInstruction: getSystemPrompt(level)
  }
});

var tally = 0;

var hat = [25, 30, 24, 23, 35, 5, 30, 34, 22, 10];

function processSerendipity(response: string | undefined) {
  if (response == undefined) return undefined;
  if (response.startsWith("RANDOM_NUMBER_REQUEST")) {
    try {
      var stringBounds = response.substring(
        response.indexOf("(") + 1,
        response.lastIndexOf(")"));
      var arr = stringBounds.split(",");
      var lowerBounds = Number(arr[0].replace(/ /g, ''));
      var upperBounds = Number(arr[1].replace(/ /g, ''));

      if (lowerBounds == 1 && upperBounds == 42) {
        tally = tally + 1;
        return hat[tally - 1];
      } else {
        return Math.floor(Math.random() * (upperBounds - lowerBounds)) + lowerBounds;
      }
    } catch {
      return "Error occured; please try wording your request differently."
    }
  }
  if (response.toLowerCase().includes("providence")) {
    // Switch to level 2 as well
    var box = new RegExp("PROVIDENCE", 'gi');
    response = response.replace(box, "██████████");
    if (level == 1) {
      level = 2;
      chat = genAI.chats.create({
        model: "gemini-2.5-flash",
        history: chat.getHistory(),     // curated vs comprehensive histories?
        config: {
          temperature: 0,
          systemInstruction: getSystemPrompt(level) 
        }
      });
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
          const response = await chat.sendMessageStream({
            message: prompt
          });

          for await (const chunk of response) {
            const piece = chunk.text;
            if (piece) {
              let resSeren = '' + processSerendipity(piece);
              controller.enqueue(new TextEncoder().encode(resSeren));
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
