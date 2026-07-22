import type { BrandingGroup, BrandingOption, ProductWithRelations } from "@/types/catalog";
import type {
  BuilderState,
  OrderMode,
  RecipientDraft,
  RecipientInput,
  SelectedBox,
  SelectedBoxView,
} from "@/types/order";

/**
 * Pure helpers for the order builder. The builder state is held client-side and
 * mirrored to sessionStorage so a mid-build refresh doesn't lose work. From the
 * gift-options step onward it is also persisted to the database as a draft order
 * (see src/app/orders/actions.ts); the saved draft id lives in `orderId`.
 */

const STORAGE_KEY = "thb-order-builder";

export const emptyBuilderState: BuilderState = {
  orderId: null,
  mode: null,
  boxes: [],
  messageCardOptionId: null,
  boxBrandingOptionId: null,
  giftTo: "",
  giftFrom: "",
  sharedMessage: "",
  recipients: [],
};

/** A blank recipient row. */
export function blankRecipient(): RecipientDraft {
  return {
    fullName: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    selfClaim: false,
    message: "",
  };
}

/** Coerce an unknown parsed object into a full RecipientDraft (defensive). */
function normalizeRecipient(r: unknown): RecipientDraft {
  const o = (r ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id: typeof o.id === "string" ? o.id : undefined,
    fullName: str(o.fullName),
    email: str(o.email),
    addressLine1: str(o.addressLine1),
    addressLine2: str(o.addressLine2),
    city: str(o.city),
    region: str(o.region),
    postalCode: str(o.postalCode),
    country: str(o.country),
    selfClaim: o.selfClaim === true,
    message: str(o.message),
  };
}

/** Load saved builder state from sessionStorage (browser only). */
export function loadBuilderState(): BuilderState {
  if (typeof window === "undefined") return emptyBuilderState;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyBuilderState;
    const parsed = JSON.parse(raw) as Partial<BuilderState>;
    return {
      orderId: typeof parsed.orderId === "string" ? parsed.orderId : null,
      mode: parsed.mode === "single" || parsed.mode === "multiple" ? parsed.mode : null,
      boxes: Array.isArray(parsed.boxes) ? parsed.boxes.filter(isValidBox) : [],
      messageCardOptionId:
        typeof parsed.messageCardOptionId === "string" ? parsed.messageCardOptionId : null,
      boxBrandingOptionId:
        typeof parsed.boxBrandingOptionId === "string" ? parsed.boxBrandingOptionId : null,
      giftTo: typeof parsed.giftTo === "string" ? parsed.giftTo : "",
      giftFrom: typeof parsed.giftFrom === "string" ? parsed.giftFrom : "",
      sharedMessage: typeof parsed.sharedMessage === "string" ? parsed.sharedMessage : "",
      recipients: Array.isArray(parsed.recipients)
        ? parsed.recipients.map(normalizeRecipient)
        : [],
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

/**
 * Drop unavailable variants from each product. The Shopify sync retires
 * superseded/sold-out sizes by marking them `available = false` (rather than
 * deleting them, which would break order history), so the catalog and builder
 * must only ever surface available sizes.
 */
export function withAvailableVariants<P extends { variants: { available: boolean }[] }>(
  products: P[],
): P[] {
  return products.map((p) => ({ ...p, variants: p.variants.filter((v) => v.available) }));
}

// ---------------------------------------------------------------------------
// Branding + pricing (one central place; future per-account overrides slot here)
// ---------------------------------------------------------------------------

/** Find a branding option by id (null id / missing → undefined). */
export function brandingById(
  options: BrandingOption[],
  id: string | null,
): BrandingOption | undefined {
  if (!id) return undefined;
  return options.find((o) => o.id === id);
}

/** Active options for a group, in display order. */
export function brandingForGroup(
  options: BrandingOption[],
  group: BrandingGroup,
): BrandingOption[] {
  return options
    .filter((o) => o.group_key === group && o.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** The default option for a group (lowest sort_order — the $0 choice). */
export function defaultBrandingOption(
  options: BrandingOption[],
  group: BrandingGroup,
): BrandingOption | undefined {
  return brandingForGroup(options, group)[0];
}

/**
 * The order total, in cents. Branding add-ons are per gift (per unit), so each
 * box's unit price = variant + message-card + box-branding, times its quantity.
 * Passing undefined branding contributes 0.
 */
export function orderTotalCents(
  views: SelectedBoxView[],
  messageCard?: BrandingOption,
  boxBranding?: BrandingOption,
): number {
  const addonPerUnit = (messageCard?.price_cents ?? 0) + (boxBranding?.price_cents ?? 0);
  return views.reduce(
    (sum, v) => sum + (v.variant.price_cents + addonPerUnit) * v.quantity,
    0,
  );
}

// ---------------------------------------------------------------------------
// Recipients
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/**
 * Human-readable issues for a recipient row (shown as inline hints). An empty
 * array means no problems. A missing name is the only hard blocker (see
 * `recipientsValid`); the rest are soft warnings.
 */
export function recipientIssues(r: RecipientDraft): string[] {
  const issues: string[] = [];
  if (!r.fullName.trim()) issues.push("Name is required");
  if (r.email.trim() && !isValidEmail(r.email)) issues.push("Email looks invalid");
  if (!r.selfClaim) {
    const hasAddress =
      r.addressLine1.trim() && r.city.trim() && r.postalCode.trim() && r.country.trim();
    if (!hasAddress) {
      issues.push("Add an address, or switch on the self-claim link");
    }
  }
  return issues;
}

/** Enough to advance: at least one recipient and every recipient has a name. */
export function recipientsValid(recipients: RecipientDraft[]): boolean {
  return recipients.length > 0 && recipients.every((r) => r.fullName.trim().length > 0);
}

/** Map a builder recipient to the server-action input (keeps id for upserts). */
export function recipientToInput(r: RecipientDraft): RecipientInput {
  return {
    id: r.id,
    fullName: r.fullName.trim(),
    email: r.email.trim(),
    addressLine1: r.addressLine1.trim(),
    addressLine2: r.addressLine2.trim(),
    city: r.city.trim(),
    region: r.region.trim(),
    postalCode: r.postalCode.trim(),
    country: r.country.trim(),
    selfClaim: r.selfClaim,
    message: r.message.trim(),
  };
}

// ---------------------------------------------------------------------------
// Resume a saved draft: map database rows back into builder state
// ---------------------------------------------------------------------------

/** The `orders` columns needed to rebuild builder state. */
export interface DraftOrderRow {
  id: string;
  mode: string | null;
  message_card_option_id: string | null;
  box_branding_option_id: string | null;
  gift_to: string | null;
  gift_from: string | null;
  shared_message: string | null;
}

/** An `order_items` row. */
export interface DraftItemRow {
  product_id: string;
  variant_id: string;
  quantity: number;
}

/** A `recipients` row (nullable contact/address, as stored). */
export interface DraftRecipientRow {
  id: string;
  claim_token: string | null;
  full_name: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  self_claim: boolean | null;
  message: string | null;
}

/**
 * Rebuild a full BuilderState from a saved draft order + its items + recipients.
 * Pure (no I/O) so it's easy to test. Crucially it carries each recipient's `id`
 * and `claimToken` through, so when the resumed builder re-saves it UPSERTS the
 * same rows (and updates the same order via `orderId`) rather than creating a
 * duplicate. Tolerates partial drafts (no boxes / no recipients yet).
 */
export function draftToBuilderState(
  order: DraftOrderRow,
  items: DraftItemRow[],
  recipients: DraftRecipientRow[],
): BuilderState {
  return {
    orderId: order.id,
    mode: order.mode === "single" || order.mode === "multiple" ? order.mode : null,
    boxes: items.map((i) => ({
      productId: i.product_id,
      variantId: i.variant_id,
      quantity: i.quantity,
    })),
    messageCardOptionId: order.message_card_option_id,
    boxBrandingOptionId: order.box_branding_option_id,
    giftTo: order.gift_to ?? "",
    giftFrom: order.gift_from ?? "",
    sharedMessage: order.shared_message ?? "",
    recipients: recipients.map((r) => ({
      id: r.id,
      claimToken: r.claim_token ?? undefined,
      fullName: r.full_name ?? "",
      email: r.email ?? "",
      addressLine1: r.address_line1 ?? "",
      addressLine2: r.address_line2 ?? "",
      city: r.city ?? "",
      region: r.region ?? "",
      postalCode: r.postal_code ?? "",
      country: r.country ?? "",
      selfClaim: r.self_claim === true,
      message: r.message ?? "",
    })),
  };
}
