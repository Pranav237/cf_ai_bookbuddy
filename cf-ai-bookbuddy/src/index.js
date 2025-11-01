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
      const { prompt } = await request.json();
      const ai = new Ai(env.AI);
      const result = await ai.run("@cf/meta/llama-3-3b-instruct", {
        prompt: `Suggest 3 books based on this description: "${prompt}". 
                 Return a JSON array of objects with "title" and "reason" keys.`,
      });
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("BookBuddy worker active!", { status: 200 });
  },
};
