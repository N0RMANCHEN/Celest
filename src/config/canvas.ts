/**
 * Canvas interaction + bounds configuration (tunable defaults).
 *
 * IMPORTANT:
 * - These values intentionally live in src/config so product can tune "feel"
 *   without touching Canvas internals.
 * - Bounds are in CANVAS (world) coordinates, not screen pixels.
 */

/** Base fixed canvas SHORT side (world coords). Actual bounds may expand to fit content. */
export const CANVAS_FIXED_HEIGHT = 16000;

/**
 * Fixed aspect ratio for the base canvas.
 *
 * We intentionally keep this constant (not dynamic) to match "mainstream Mac" feel.
 * Default: 16:10 (MacBook common aspect).
 */
export const CANVAS_FIXED_ASPECT_RATIO = 16 / 10;

/** Base fixed canvas width derived from height * aspect ratio. */
export const CANVAS_FIXED_WIDTH = CANVAS_FIXED_HEIGHT * CANVAS_FIXED_ASPECT_RATIO;

/** Extra padding around content bounds when expanding canvas bounds (world coords). */
export const CANVAS_CONTENT_BOUNDS_PADDING = 800;

/** Clamp zoom range for viewport interactions. */
export const CANVAS_MIN_ZOOM = 0.1;
export const CANVAS_MAX_ZOOM = 5;


