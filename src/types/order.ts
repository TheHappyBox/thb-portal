import type { ProductVariant, ProductWithRelations } from "@/types/catalog";

/**
 * Order-builder types. The builder mirrors its state to sessionStorage as the
 * buyer works; once they reach the gift-options step it also persists a DRAFT
 * order to the database (see src/app/orders/actions.ts). `orderId` is the saved
 * draft's id (null until first saved).
 */

/** Single recipient vs many recipients — set by the "Recipients count" step. */
export type OrderMode = "single" | "multiple";

/** One chosen box: a product, a chosen size (variant), and how many. */
export interface SelectedBox {
  productId: string;
  variantId: string;
  quantity: number;
}

/**
 * One recipient as edited in the builder. Contact/address are optional; when
 * `selfClaim` is true the buyer is sending a link for the recipient to add their
 * own address later. `message` overrides the order's shared message when present.
 * `id` is the database row id once persisted.
 */
export interface RecipientDraft {
  id?: string;
  fullName: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  selfClaim: boolean;
  message: string;
}

/**
 * The whole in-progress order. `mode` and `boxes` are INDEPENDENT: either can be
 * set first depending on how the buyer entered the builder. The remaining fields
 * are filled in the gift-options and recipients steps.
 */
export interface BuilderState {
  /** Saved draft order id, or null before the first save. */
  orderId: string | null;
  mode: OrderMode | null;
  boxes: SelectedBox[];
  /** Chosen branding_options ids (null = not chosen / not applicable). */
  messageCardOptionId: string | null;
  boxBrandingOptionId: string | null;
  /** Shared/default gift message for the whole order. */
  sharedMessage: string;
  recipients: RecipientDraft[];
}

/**
 * A SelectedBox resolved against the catalog for display — the box joined to its
 * product and the specific chosen variant. Used by the box step and the summary.
 */
export interface SelectedBoxView extends SelectedBox {
  product: ProductWithRelations;
  variant: ProductVariant;
  /** quantity × variant.price_cents (box only — branding added separately) */
  lineTotalCents: number;
}

/** Input to the saveOrderDraft server action (serializable). */
export interface OrderDraftInput {
  orderId: string | null;
  mode: OrderMode;
  boxes: SelectedBox[];
  messageCardOptionId: string | null;
  boxBrandingOptionId: string | null;
  sharedMessage: string;
}

/** A single recipient as sent to the saveRecipients server action. */
export interface RecipientInput {
  fullName: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  selfClaim: boolean;
  message: string;
}

/** Standard result shape for the order server actions. */
export type ActionResult<T> = ({ ok: true } & T) | { ok: false; error: string };
