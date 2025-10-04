import { serve } from "jsr:@supabase/functions";
const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.5-flash-lite";

serve(async (req) => {
  try {
    const { content } = await req.json();
    if (!content) {
      return new Response(JSON.stringify({ error: "Missing note content" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Missing Gemini API Key" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const prompt = `Improve and format this note for clarity, grammar, and style. Return only the improved note as plain text.\n\nNote:\n${content}`;
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, responseMimeType: "text/plain" },
        }),
      }
    );
    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${geminiRes.status} ${errorText}` }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const aiData = await geminiRes.json();
    const improvedContent = aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    return new Response(JSON.stringify({ improvedContent }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
