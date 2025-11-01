import { Ai } from "@cloudflare/ai";

export class MyDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    const wishlist = (await this.state.storage.get("wishlist")) || [];

    if (url.pathname.endsWith("/add") && request.method === "POST") {
      const body = await request.json();
      if (!body.title) return new Response("Missing title", { status: 400 });

      wishlist.push(body.title);
      await this.state.storage.put("wishlist", wishlist);

      return new Response(JSON.stringify({ ok: true, wishlist }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/remove") && request.method === "POST") {
      const body = await request.json();
      const updated = wishlist.filter((b) => b !== body.title);
      await this.state.storage.put("wishlist", updated);

      return new Response(JSON.stringify({ ok: true, wishlist: updated }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/wishlist") && request.method === "GET") {
      return new Response(JSON.stringify({ wishlist }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
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
                   Return only valid JSON — [{"title": "...", "reason": "..."}]`
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

    if (url.pathname.startsWith("/wishlist")) {
      const id = env.MY_DURABLE_OBJECT.idFromName("global-wishlist");
      const stub = env.MY_DURABLE_OBJECT.get(id);
      return stub.fetch(request);
    }

    if (url.pathname === "/kv" && request.method === "POST") {
      const { key, value } = await request.json();
      await env.BOOKBUDDY_KV.put(key, value);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/kv" && request.method === "GET") {
      const key = url.searchParams.get("key");
      const value = await env.BOOKBUDDY_KV.get(key);
      return new Response(JSON.stringify({ key, value }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("BookBuddy worker active!", { status: 200 });
  },
};
