// app/api/gemini-response/route.ts
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {

  try {
    const { prompt } = await request.json();

    const apiKey = process.env.GEMINI_API;
    if (!apiKey) {
      return new Response("Missing GEMINI_API_KEY", { status: 500 });
    }

    const genAI = new GoogleGenAI({apiKey : apiKey});

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await genAI.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: prompt,
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
