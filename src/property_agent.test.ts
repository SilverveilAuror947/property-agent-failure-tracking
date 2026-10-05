import assert from "node:assert/strict";
import { planInspection } from "./property_agent.js";

const result = planInspection({ propertyId: "oak-12", unit: "3B", tenantDocument: "lease-204", maintenanceRequest: "water leak under sink", inspectionDue: "2026-10-01" });
assert.equal(result.priority, "urgent");
assert.equal(result.reminder, "Inspect oak-12/3B by 2026-10-01");
console.log("property decision test passed");
