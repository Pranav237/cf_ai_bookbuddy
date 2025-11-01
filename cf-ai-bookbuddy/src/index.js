import { Ai } from "@cloudflare/ai";

export class MyDurableObject {
  async fetch(request) {
    return new Response("Durable Object active!");
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/suggest" && request.method === "POST") {
      try {
        const { prompt } = await request.json();
        const ai = new Ai(env.AI);
        const result = await ai.run("@cf/meta/llama-3-8b-instruct", {
          prompt: `Suggest 3 books based on this description: "${prompt}". 
                   Return only valid JSON — a list of objects like:
                   [{"title": "...", "reason": "..."}]`
        });

        let text = result?.response || result;
        if (typeof text === "object") text = JSON.stringify(text, null, 2);

        return new Response(text, {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response("BookBuddy worker active!", { status: 200 });
  },
};
