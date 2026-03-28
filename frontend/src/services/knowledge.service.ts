/**
 * Procedure-based knowledge service for system-instruction-first RAG.
 *
 * Fetches structured repair procedures from the backend and formats
 * them for injection into the Gemini system instruction BEFORE
 * connection. No mid-session text injection.
 *
 * Depends on: @/types (RepairProcedure, ProcedureSearchResponse)
 * Used by: use-session hook
 */

import type { RepairProcedure, ProcedureSearchResponse } from "@/types";

export interface KnowledgeService {
  searchProcedures: (
    query: string,
    equipmentType?: string
  ) => Promise<RepairProcedure[]>;
  formatProceduresForSystemPrompt: (procedures: RepairProcedure[]) => string;
}

const EQUIPMENT_TRIGGERS = [
  "i can see",
  "i see a",
  "this is a",
  "this looks like",
  "toaster",
  "breville",
  "cuisinart",
  "carrier",
  "trane",
  "crac",
  "crah",
  "ups",
  "pdu",
  "breaker",
  "panel",
];

export function looksLikeEquipmentId(text: string): boolean {
  const lower = text.toLowerCase();
  return EQUIPMENT_TRIGGERS.some((t) => lower.includes(t));
}

/** Empty backendUrl → same-origin `/api/...` (Vite dev proxy to FastAPI). */
function apiUrl(backendUrl: string, path: string): string {
  const base = backendUrl.trim();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) {
    return p;
  }
  return `${base.replace(/\/$/, "")}${p}`;
}

export function createKnowledgeService(backendUrl: string): KnowledgeService {
  async function searchProcedures(
    query: string,
    equipmentType: string = ""
  ): Promise<RepairProcedure[]> {
    try {
      const response = await fetch(apiUrl(backendUrl, "/api/procedures/search"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          equipment_type: equipmentType,
          max_results: 3,
        }),
      });

      if (!response.ok) {
        console.warn(
          `[KnowledgeService] Backend returned ${response.status}`
        );
        return [];
      }

      const data = (await response.json()) as ProcedureSearchResponse;
      return data.procedures ?? [];
    } catch (err) {
      console.warn("[KnowledgeService] Failed to search procedures:", err);
      return [];
    }
  }

  function formatProceduresForSystemPrompt(
    procedures: RepairProcedure[]
  ): string {
    if (procedures.length === 0) return "";

    const sections = procedures.map((proc) => {
      const stepLines = proc.steps.map((step) => {
        let line = `  Step ${step.order}: ${step.action}`;
        line += `\n    Look for: ${step.whatToLookFor}`;
        line += `\n    Confirm: ${step.visualConfirmation}`;
        if (step.overlay) {
          line += `\n    Overlay: "${step.overlay.label}" at ${step.overlay.position} (${step.overlay.type})`;
        }
        if (step.ifIssueFound) {
          line += `\n    If issue: ${step.ifIssueFound}`;
        }
        if (step.safetyNote) {
          line += `\n    SAFETY: ${step.safetyNote}`;
        }
        return line;
      });

      return [
        `### Procedure: ${proc.symptom}`,
        `Equipment: ${proc.equipment.type} (${proc.equipment.models.join(", ") || "generic"})`,
        `Difficulty: ${proc.difficulty} | Est. time: ${proc.estimatedTimeMinutes} min`,
        `Tools needed: ${proc.toolsRequired.join(", ") || "none"}`,
        "",
        "Safety preconditions:",
        ...proc.safety.preconditions.map((p) => `  - ${p}`),
        "",
        "Steps:",
        ...stepLines,
        "",
        `Sources: ${proc.sources.join(", ")}`,
      ].join("\n");
    });

    return [
      "",
      "## LOADED REPAIR PROCEDURES",
      "",
      "Follow these procedures step-by-step when the symptom matches.",
      "Use advance_step tool after visually confirming each step is complete.",
      "Use complete_procedure tool when all steps are done.",
      "Call show_overlay with the overlay hints specified in each step.",
      "",
      ...sections,
    ].join("\n");
  }

  return { searchProcedures, formatProceduresForSystemPrompt };
}
