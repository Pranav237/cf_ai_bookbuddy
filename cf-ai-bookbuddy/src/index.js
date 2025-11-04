import { Ai } from "@cloudflare/ai";

export class MyDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch() {
    return new Response("Durable Object placeholder active", { status: 200 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/suggest" && request.method === "POST") {
      try {
        const { prompt } = await request.json();
        if (!prompt) {
          return new Response("Missing prompt", { status: 400 });
        }

        const ai = new Ai(env.AI);

        const result = await ai.run("@cf/meta/llama-3-8b-instruct", {
          prompt: `
Respond ONLY with strict JSON. 
Do NOT include explanations or prose.
Output format:
[
  {"title": "Book Title 1", "reason": "Reason text..."},
  {"title": "Book Title 2", "reason": "Reason text..."},
  {"title": "Book Title 3", "reason": "Reason text..."}
]

Now, suggest 3 books that match this description: "${prompt}".
`
        });

        let raw = result?.response || result;
        let parsed = [];

        try {
          parsed = JSON.parse(raw);
        } catch {
          const match = raw.match(/\[[\s\S]*\]/);
          if (match) {
            try {
              parsed = JSON.parse(match[0]);
            } catch {
              parsed = [{ title: "Error", reason: "Could not parse extracted JSON." }];
            }
          } else {
            parsed = [{ title: "Error", reason: raw }];
          }
        }

        return new Response(JSON.stringify({ suggestions: parsed }), {
          headers: { "Content-Type": "application/json" },
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (url.pathname === "/wishlist/add" && request.method === "POST") {
      try {
        const body = await request.json();
        if (!body.title) {
          return new Response("Missing title", { status: 400 });
        }

        const note = body.note || "";
        await env.BOOKBUDDY_KV.put(body.title, note);

        const list = await env.BOOKBUDDY_KV.list();
        const wishlist = [];
        for (const k of list.keys) {
          const n = await env.BOOKBUDDY_KV.get(k.name);
          if (n !== null) wishlist.push({ title: k.name, note: n });
        }

        return new Response(JSON.stringify({ ok: true, wishlist }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (url.pathname === "/wishlist/remove" && request.method === "POST") {
      try {
        const body = await request.json();
        if (!body.title) {
          return new Response("Missing title", { status: 400 });
        }

        await env.BOOKBUDDY_KV.delete(body.title);

        const list = await env.BOOKBUDDY_KV.list();
        const wishlist = [];
        for (const k of list.keys) {
          const n = await env.BOOKBUDDY_KV.get(k.name);
          if (n !== null) wishlist.push({ title: k.name, note: n });
        }

        return new Response(
          JSON.stringify({ ok: true, deleted: body.title, wishlist }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (url.pathname === "/wishlist" && request.method === "GET") {
      try {
        const list = await env.BOOKBUDDY_KV.list();
        const wishlist = [];

        for (const k of list.keys) {
          const note = await env.BOOKBUDDY_KV.get(k.name);
          if (note !== null) wishlist.push({ title: k.name, note });
        }

        return new Response(JSON.stringify({ wishlist }), {
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
