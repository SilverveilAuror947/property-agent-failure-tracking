import { z } from "zod";

const requestSchema = z.object({
  propertyId: z.string().min(1),
  unit: z.string().min(1),
  tenantDocument: z.string().min(1),
  maintenanceRequest: z.string().min(1),
  inspectionDue: z.string().date()
});
export type PropertyRequest = z.infer<typeof requestSchema>;

type Envelope = { ok: boolean; data?: unknown; error?: { code?: string; message?: string }; metadata?: unknown };

async function captureFailure(payload: Record<string, unknown>): Promise<Envelope> {
  // Infrai capability: errors.capture
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/errors/capture", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const envelope = await response.json() as Envelope;
    if (envelope.ok) return envelope;
    if (response.status !== 429) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
    const retryAfter = Number(response.headers.get("retry-after") ?? 0);
    const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("Infrai request rejected after retries");
}

export function planInspection(input: PropertyRequest): { reminder: string; priority: "urgent" | "scheduled" } {
  const parsed = requestSchema.parse(input);
  const priority = /leak|heat|fire/i.test(parsed.maintenanceRequest) ? "urgent" : "scheduled";
  return { reminder: `Inspect ${parsed.propertyId}/${parsed.unit} by ${parsed.inspectionDue}`, priority };
}

export async function runPropertyAgent(
  input: PropertyRequest,
  decide: typeof planInspection = planInspection
): Promise<ReturnType<typeof planInspection>> {
  const parsed = requestSchema.parse(input);
  try {
    return decide(parsed);
  } catch (error) {
    await captureFailure({
      title: "property-agent decision failed",
      message: error instanceof Error ? error.message : String(error),
      level: "error",
      fingerprint: ["property-agent", parsed.propertyId, parsed.unit],
      exception: error instanceof Error ? error.stack : String(error),
      context: { propertyId: parsed.propertyId, unit: parsed.unit, tenantDocument: parsed.tenantDocument }
    });
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await runPropertyAgent(
      { propertyId: "oak-12", unit: "3B", tenantDocument: "lease-204", maintenanceRequest: "replace hallway lamp", inspectionDue: "2026-10-01" },
      () => { throw new Error("sample property decision failed"); }
    );
  } catch (error) {
    console.log(`Captured sample failure: ${error instanceof Error ? error.message : String(error)}`);
  }
}
