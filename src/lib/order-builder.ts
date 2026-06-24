import type { ProductWithRelations } from "@/types/catalog";
import type {
  BuilderState,
  OrderMode,
  SelectedBox,
  SelectedBoxView,
} from "@/types/order";

/**
 * Pure helpers for the order builder. The builder state is held client-side and
 * mirrored to sessionStorage so a mid-build refresh doesn't lose work. Nothing
 * here touches the database — that arrives with the later save/submit step.
 */

const STORAGE_KEY = "thb-order-builder";

export const emptyBuilderState: BuilderState = { mode: null, boxes: [] };

/** Load saved builder state from sessionStorage (browser only). */
export function loadBuilderState(): BuilderState {
  if (typeof window === "undefined") return emptyBuilderState;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyBuilderState;
    const parsed = JSON.parse(raw) as Partial<BuilderState>;
    return {
      mode: parsed.mode === "single" || parsed.mode === "multiple" ? parsed.mode : null,
      boxes: Array.isArray(parsed.boxes) ? parsed.boxes.filter(isValidBox) : [],
    };
  } catch {
    // Corrupt/blocked storage shouldn't break the builder — start fresh.
    return emptyBuilderState;
  }
}

/** Persist builder state to sessionStorage (browser only, never throws). */
export function saveBuilderState(state: BuilderState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or disabled — non-fatal; the in-memory state still works.
  }
}

/** Clear saved builder state (browser only). */
export function clearBuilderState(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal.
  }
}

function isValidBox(b: unknown): b is SelectedBox {
  return (
    !!b &&
    typeof b === "object" &&
    typeof (b as SelectedBox).productId === "string" &&
    typeof (b as SelectedBox).variantId === "string" &&
    typeof (b as SelectedBox).quantity === "number" &&
    (b as SelectedBox).quantity >= 1
  );
}

/**
 * Merge an entry-point box (arrived via ?box=&variant=) into existing state
 * without clobbering an in-progress mode. Dedupes on productId+variantId; if the
 * same product+size is already chosen we leave it as-is.
 */
export function mergeInitialBox(
  state: BuilderState,
  initialBox: SelectedBox | null,
): BuilderState {
  if (!initialBox) return state;
  const exists = state.boxes.some(
    (b) => b.productId === initialBox.productId && b.variantId === initialBox.variantId,
  );
  if (exists) return state;
  return { ...state, boxes: [...state.boxes, initialBox] };
}

/**
 * Reconcile the box list when the mode changes. Switching to "single" keeps only
 * the first chosen box at quantity 1 (a single-recipient order is exactly one
 * box); switching to "multiple" leaves the selection untouched.
 */
export function reconcileBoxesForMode(
  boxes: SelectedBox[],
  mode: OrderMode,
): SelectedBox[] {
  if (mode === "single") {
    return boxes.length > 0 ? [{ ...boxes[0], quantity: 1 }] : [];
  }
  return boxes;
}

/** Whether the box selection satisfies the chosen mode. */
export function boxesValidForMode(boxes: SelectedBox[], mode: OrderMode): boolean {
  if (boxes.length === 0) return false;
  if (boxes.some((b) => b.quantity < 1)) return false;
  if (mode === "single") return boxes.length === 1;
  return true;
}

/** Resolve SelectedBoxes against the catalog for display. Skips unknown rows. */
export function resolveBoxes(
  boxes: SelectedBox[],
  products: ProductWithRelations[],
): SelectedBoxView[] {
  const views: SelectedBoxView[] = [];
  for (const box of boxes) {
    const product = products.find((p) => p.id === box.productId);
    const variant = product?.variants.find((v) => v.id === box.variantId);
    if (!product || !variant) continue;
    views.push({
      ...box,
      product,
      variant,
      lineTotalCents: variant.price_cents * box.quantity,
    });
  }
  return views;
}

/** Sum of all line totals, in cents. */
export function orderTotalCents(views: SelectedBoxView[]): number {
  return views.reduce((sum, v) => sum + v.lineTotalCents, 0);
}
