import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_LIMIT = 30;
const TIME_ZONE = "America/Los_Angeles";
const GEMINI_MODEL = "gemini-2.5-flash-lite";

interface NodePayload {
  id: string;
  text: string;
  tags: string[];
}

interface ClusterRequestPayload {
  nodes?: NodePayload[];
  userId?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase service credentials are not configured");
}

if (!geminiApiKey) {
  console.error("GEMINI_API_KEY is not configured");
}

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
        },
      })
    : null;

const formatUsageDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);

const buildPrompt = (nodes: NodePayload[]) => {
  const nodeSummaries = nodes
    .map((node) => `[${node.id}] ${node.text} ${(node.tags || []).join(" ")}`)
    .join("\n");

  return `Analyze these nodes and group them into meaningful clusters (2-5 clusters max).
Return JSON with this structure:
{
  "clusters": [
    {
      "name": "Cluster Name",
      "color": "#HEX",
      "nodeIds": ["node1", "node2"]
    }
  ]
}

Nodes:
${nodeSummaries}

Rules:
- Create 2-5 clusters based on semantic similarity
- Each node should belong to exactly one cluster
- Choose descriptive names (2-3 words)
- Use distinct, vibrant colors
- Include ALL node IDs
- Respond with valid JSON only.`;
};

const extractJson = (content: string | undefined) => {
  if (!content) return null;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as ClusterRequestPayload;
    const nodes = payload.nodes ?? [];
    const userId = payload.userId;

    if (!nodes.length) {
      return new Response(
        JSON.stringify({ error: "No nodes provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not initialized");
    }

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const now = new Date();
    const usageDate = formatUsageDate(now);

    // For now, skip usage tracking to get clustering working
    // TODO: Implement proper usage tracking with RLS policies
    console.log("Skipping usage tracking for now");

    const prompt = buildPrompt(nodes);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            role: "system",
            parts: [
              {
                text: "You are a clustering expert. Always respond with valid JSON only.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Gemini rate limit exceeded. Please wait and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Gemini API error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiContent = aiData.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    console.log("Gemini response", aiContent);

    const jsonPayload = extractJson(aiContent || "");
    if (!jsonPayload) {
      throw new Error("No JSON found in Gemini response");
    }

    const clusters = JSON.parse(jsonPayload);

    const responseBody = {
      ...clusters,
      usage: {
        count: 1,
        limit: DAILY_LIMIT,
      },
    };

    return new Response(
      JSON.stringify(responseBody),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in cluster-nodes function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Daily clustering limit") ? 429 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
