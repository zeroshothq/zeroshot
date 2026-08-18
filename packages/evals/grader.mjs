// zeroshot evals - blind LLM grader for agentic expectations.
// BLINDNESS IS A HARD RULE: this module must never receive or reference the
// skill content or which arm (control/skill) produced the transcript. The
// grade() signature deliberately has no parameter that could carry skill text
// or arm identity, and callers must not smuggle either into the transcript.
// Zero dependencies. Node 22+.

const API_URL = "https://api.anthropic.com/v1/messages";
const TRANSCRIPT_TAIL = 30000;
const MAX_TOKENS = 1500;

const SYSTEM = [
  "You are a strict, blind evaluator of an AI coding agent's session.",
  "You are given a list of expectations, the tail of the session transcript, and a listing of files present after the session.",
  "For each expectation, decide only whether the transcript or file listing provides concrete evidence that it was met.",
  "Evidence must be a one-line quote from the transcript or a specific file fact; if the evidence is absent, the expectation is not met.",
  "Do not speculate, do not give partial credit, do not grade anything beyond the listed expectations.",
  'Respond with JSON only, no prose, no code fences: {"results":[{"id":"<expectation id>","met":true|false,"evidence":"<one line>"}]}',
].join("\n");

function buildUser(expectations, transcriptText, filesAfter) {
  const exps = expectations.map((e) => `- ${e.id}: ${e.description}`).join("\n");
  const tail = String(transcriptText || "").slice(-TRANSCRIPT_TAIL);
  const list = Array.isArray(filesAfter) ? filesAfter : Object.keys(filesAfter || {});
  const files = list.map((f) => `- ${f}`).join("\n") || "(none)";
  return [
    "Expectations to grade:",
    exps,
    "",
    "Files present after the session:",
    files,
    "",
    `Transcript (last ${TRANSCRIPT_TAIL} chars):`,
    tail,
    "",
    "Grade each expectation. JSON only.",
  ].join("\n");
}

// Strip fences and take first { to last } so mildly malformed replies still parse.
function parseJson(text) {
  const cleaned = String(text || "").replace(/```(?:json)?/g, "");
  const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(cleaned.slice(a, b + 1)); } catch { return null; }
}

export async function grade({ apiKey, model, expectations, transcriptText, filesAfter }) {
  const unavailable = () => ({
    results: expectations.map((e) => ({ id: e.id, met: null, evidence: "grader unavailable" })),
  });
  if (!expectations || !expectations.length) return { results: [] };
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        messages: [{ role: "user", content: buildUser(expectations, transcriptText, filesAfter) }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status !== 200) return unavailable();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const parsed = parseJson(text);
    if (!parsed || !Array.isArray(parsed.results)) return unavailable();
    const byId = new Map(parsed.results.map((r) => [r && r.id, r]));
    return {
      results: expectations.map((e) => {
        const r = byId.get(e.id);
        if (!r || typeof r.met !== "boolean") return { id: e.id, met: null, evidence: "grader unavailable" };
        return { id: e.id, met: r.met, evidence: String(r.evidence || "") };
      }),
    };
  } catch {
    return unavailable();
  }
}
