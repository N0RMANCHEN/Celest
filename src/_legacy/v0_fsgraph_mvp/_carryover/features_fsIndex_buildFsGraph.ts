/**
 * Legacy carryover
 * ----------------
 *
 * This file used to live at `src/features/fsIndex/buildFsGraph.ts` while the app
 * rendered an FSGraph directly on the canvas.
 *
 * As of Step4C, the canvas truth-source is CodeGraph, and FS Index is used only
 * for navigation (Left Tree). We keep the old FSGraph builder here for reference
 * and possible debugging, but it MUST NOT be used by new features.
 */

export { buildFsGraph } from "../services/fsGraph";
