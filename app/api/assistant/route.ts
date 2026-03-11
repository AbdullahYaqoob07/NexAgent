import { NextRequest, NextResponse } from "next/server";

const CHATBOT_API = "https://aiassitance.swedenrelocators.se";
const BACKEND_API = "http://localhost:8000";

// Cache the node catalog for 5 minutes so we don't hit the backend on every message
let _nodeCatalogCache: { data: any; ts: number } = { data: null, ts: 0 };
const CATALOG_TTL_MS = 5 * 60 * 1000;

async function getNodeCatalog(): Promise<string> {
  const now = Date.now();
  if (_nodeCatalogCache.data && now - _nodeCatalogCache.ts < CATALOG_TTL_MS) {
    return _nodeCatalogCache.data;
  }
  try {
    const res = await fetch(`${BACKEND_API}/api/v1/nodes`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`nodes API ${res.status}`);
    const nodes: any[] = await res.json();

    // Build a compact, LLM-readable summary of every node's inputs and outputs
    const summary = nodes.map((n: any) => {
      const params = (n.parameters || [])
        .map((p: any) => `    - ${p.name} (${p.type}${p.required ? ", required" : ""}): ${p.description || ""}`)
        .join("\n");
      const outputs = (n.outputs || [])
        .map((o: any) => `    - {{$node.<nodeId>.${o.name}}} → ${o.display_name} (${o.type}): ${o.description || ""}`)
        .join("\n");
      return [
        `## ${n.type} [${n.category}]`,
        `${n.description}`,
        params ? `  Inputs:\n${params}` : "  Inputs: none",
        outputs ? `  Outputs (use these in variable references):\n${outputs}` : "  Outputs: none",
      ].join("\n");
    }).join("\n\n");

    const catalog = `NEXAGENT NODE CATALOG (authoritative — always use these exact output field names in {{$node.X.field}} references):\n\n${summary}`;
    _nodeCatalogCache = { data: catalog, ts: now };
    return catalog;
  } catch {
    // Backend not reachable — return empty string, don't fail the chat
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Enrich the question with the live node catalog so the chatbot knows
    // exact output field names and doesn't hallucinate variable references
    const catalog = await getNodeCatalog();
    const enrichedBody = catalog
      ? { ...body, node_catalog: catalog }
      : body;

    const upstream = await fetch(`${CHATBOT_API}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enrichedBody),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to reach assistant service", detail: err?.message },
      { status: 502 }
    );
  }
}
