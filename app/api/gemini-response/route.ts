// app/api/gemini-response/route.ts
import { GoogleGenAI } from "@google/genai";
import fs from 'node:fs';

// FIXME: this code is unsafe, could error and crash the program

const data = fs.readFileSync('app/sys-prompt.txt', 'utf8');
const apiKey = process.env.GEMINI_API;
const genAI = new GoogleGenAI({apiKey : apiKey});
const chat = genAI.chats.create({
  model: "gemini-2.5-flash",
  config: {
    systemInstruction: data
  }
});

var tally = 0;

var hat = [25, 30, 24, 23, 35, 5, 30, 34, 22, 10];

function processSerendipity(response) {
    if (response.startsWith("RANDOM_NUMBER_REQUEST")) {
        try {
            var stringBounds = response.substring(
                response.indexOf("(") + 1, 
                response.lastIndexOf(")"));
            var arr = stringBounds.split(",");
            var lowerBounds = Number(arr[0].replace(/ /g,''));
            var upperBounds = Number(arr[1].replace(/ /g,''));

            if (lowerBounds == 1 && upperBounds == 42) {
                tally = tally +1;
                return hat[tally-1];
            } else {
                value = Math.floor(Math.random() * (upperBounds-lowerBounds)) + lowerBounds;
                return value;
            }
        } catch {
            return "Error occured; please try wording your request differently."
        }
    }
    if (response.toLowerCase().includes("providence")) {
        var box = new RegExp("PROVIDENCE", 'gi');
        response = response.replace(box, "██████████")
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
            const resSeren = processSerendipity(piece);
            if (resSeren) {
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
