"use client";

import { useEffect, useRef, useState } from "react";
import type { BrandingOption, ProductWithRelations } from "@/types/catalog";
import type {
  BuilderState,
  OrderMode,
  RecipientDraft,
  SelectedBox,
} from "@/types/order";
import {
  boxesValidForMode,
  brandingById,
  defaultBrandingOption,
  emptyBuilderState,
  loadBuilderState,
  mergeInitialBox,
  orderTotalCents,
  reconcileBoxesForMode,
  recipientsValid,
  recipientToInput,
  resolveBoxes,
  saveBuilderState,
} from "@/lib/order-builder";
import { formatPrice } from "@/lib/pricing";
import { saveOrderDraft, saveRecipients } from "@/app/orders/actions";
import { ModeStep } from "@/components/order-builder/mode-step";
import { BoxStep } from "@/components/order-builder/box-step";
import { GiftOptionsStep } from "@/components/order-builder/gift-options-step";
import { RecipientsStep } from "@/components/order-builder/recipients-step";
import { OrderSummary } from "@/components/order-builder/order-summary";

type Step = "mode" | "boxes" | "giftOptions" | "recipients" | "summary";

/** Pick the first unfinished step when resuming from saved state. */
function stepFor(state: BuilderState): Step {
  if (!state.mode) return "mode";
  if (!boxesValidForMode(state.boxes, state.mode)) return "boxes";
  if (recipientsValid(state.recipients)) return "summary";
  return state.orderId ? "recipients" : "giftOptions";
}

/**
 * Whether the box step is worth showing after the mode is chosen. SINGLE mode
 * with a box already picked (e.g. arrived from the catalog) has nothing left to
 * choose, so it skips the box step; otherwise the box step is shown.
 */
function skipsBoxStep(state: BuilderState): boolean {
  return state.mode === "single" && boxesValidForMode(state.boxes, state.mode);
}

/**
 * Order builder shell (Figma redesign). A full-height column — a step indicator
 * on top, the current step's content scrolling in the middle, and a sticky footer
 * with the running Order Total + navigation. Holds the in-progress order and
 * mirrors it to sessionStorage; from the gift-options step onward it also persists
 * a DRAFT order to the database via server actions (account-scoped).
 */
export function OrderBuilder({
  products,
  brandingOptions,
  initialBox,
  initialDraft = null,
}: {
  products: ProductWithRelations[];
  brandingOptions: BrandingOption[];
  initialBox: SelectedBox | null;
  /**
   * A saved draft loaded from the database (resume flow). When present it takes
   * precedence over sessionStorage and the ?box= entry point: the builder reopens
   * fully pre-filled, and because its orderId is set, further edits update the
   * SAME draft order rather than creating a new one.
   */
  initialDraft?: BuilderState | null;
}) {
  const [view, setView] = useState<{ state: BuilderState; step: Step }>(() => ({
    state: initialDraft ?? mergeInitialBox(emptyBuilderState, initialBox),
    step: "mode",
  }));
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const hydrated = useRef(false);

  // One-time hydration. A resumed draft wins; otherwise restore from
  // sessionStorage (an external store) merged with any ?box= entry point.
  useEffect(() => {
    const loaded = initialDraft ?? mergeInitialBox(loadBuilderState(), initialBox);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration
    setView({ state: loaded, step: stepFor(loaded) });
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to sessionStorage after every change (once hydrated).
  useEffect(() => {
    if (hydrated.current) saveBuilderState(view.state);
  }, [view.state]);

  const { state, step } = view;

  // ---- state updates ----
  function patchState(patch: Partial<BuilderState>) {
    setView((prev) => ({ ...prev, state: { ...prev.state, ...patch } }));
  }
  function setBoxes(boxes: SelectedBox[]) {
    patchState({ boxes });
  }
  function setRecipients(recipients: RecipientDraft[]) {
    patchState({ recipients });
  }
  function goTo(step: Step) {
    setView((prev) => ({ ...prev, step }));
  }

  // Apply branding defaults (the $0 option per group) if not chosen yet.
  function withBrandingDefaults(s: BuilderState): BuilderState {
    return {
      ...s,
      messageCardOptionId:
        s.messageCardOptionId ??
        defaultBrandingOption(brandingOptions, "message_card")?.id ??
        null,
      boxBrandingOptionId:
        s.boxBrandingOptionId ??
        defaultBrandingOption(brandingOptions, "box_branding")?.id ??
        null,
    };
  }

  // Persist the draft order (+ items + branding + message). Returns the order id.
  async function persistDraft(s: BuilderState): Promise<string | null> {
    if (!s.mode) return null;
    const res = await saveOrderDraft({
      orderId: s.orderId,
      mode: s.mode,
      boxes: s.boxes,
      messageCardOptionId: s.messageCardOptionId,
      boxBrandingOptionId: s.boxBrandingOptionId,
      giftTo: s.giftTo,
      giftFrom: s.giftFrom,
      sharedMessage: s.sharedMessage,
    });
    if (!res.ok) {
      setActionError(res.error);
      return null;
    }
    return res.orderId;
  }

  // ---- transitions ----
  // Select a mode (highlights the card); the footer's Continue advances.
  function selectMode(mode: OrderMode) {
    patchState({ mode, boxes: reconcileBoxesForMode(state.boxes, mode) });
  }

  // Advance from the mode step: single-with-box skips straight to gift options.
  function continueFromMode() {
    if (skipsBoxStep(state)) {
      void enterGiftOptions(state);
    } else {
      goTo("boxes");
    }
  }

  // Move into gift options, seeding branding defaults and saving the draft.
  async function enterGiftOptions(base: BuilderState) {
    const next = withBrandingDefaults(base);
    setView({ state: next, step: "giftOptions" });
    setSaving(true);
    setActionError(null);
    const orderId = await persistDraft(next);
    setSaving(false);
    if (orderId) patchState({ orderId });
  }

  async function continueFromGiftOptions() {
    goTo("recipients");
    setSaving(true);
    setActionError(null);
    const orderId = await persistDraft(state);
    setSaving(false);
    if (orderId) patchState({ orderId });
  }

  async function continueFromRecipients() {
    setSaving(true);
    setActionError(null);
    // Make sure the draft exists before attaching recipients.
    let orderId = state.orderId;
    if (!orderId) orderId = await persistDraft(state);
    if (!orderId) {
      setSaving(false);
      return; // persistDraft already set the error
    }
    if (state.orderId !== orderId) patchState({ orderId });
    const res = await saveRecipients(orderId, state.recipients.map(recipientToInput));
    setSaving(false);
    if (!res.ok) {
      setActionError(res.error);
      return;
    }
    // Thread the saved ids + claim tokens back in (same order we sent), so the
    // review can show each self-claim recipient's link and re-saves can upsert.
    setView((prev) => ({
      state: {
        ...prev.state,
        recipients: prev.state.recipients.map((r, i) => ({
          ...r,
          id: res.recipients[i]?.id ?? r.id,
          claimToken: res.recipients[i]?.claimToken ?? r.claimToken,
        })),
      },
      step: "summary",
    }));
  }

  // ---- derived ----
  const views = resolveBoxes(state.boxes, products);
  const messageCard = brandingById(brandingOptions, state.messageCardOptionId);
  const boxBranding = brandingById(brandingOptions, state.boxBrandingOptionId);
  const totalCents = orderTotalCents(views, messageCard, boxBranding);
  const currency = views[0]?.variant.currency ?? "CAD";
  const canContinueBoxes = state.mode ? boxesValidForMode(state.boxes, state.mode) : false;
  const canContinueRecipients = recipientsValid(state.recipients);

  const steps: { key: Step; label: string }[] = [
    { key: "mode", label: "Type" },
    { key: "boxes", label: "Boxes" },
    { key: "giftOptions", label: "Gift options" },
    { key: "recipients", label: "Recipients" },
    { key: "summary", label: "Review" },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);

  // Which steps the buyer may jump to. Going BACK to any visited step is always
  // allowed; going FORWARD is only allowed once that step's prerequisites are met
  // (so you can move freely without getting bounced out or skipping ahead).
  const boxesOk = !!state.mode && boxesValidForMode(state.boxes, state.mode);
  const reachable: Record<Step, boolean> = {
    mode: true,
    boxes: !!state.mode,
    giftOptions: boxesOk,
    recipients: boxesOk,
    summary: canContinueRecipients,
  };
  const canGoToIndex = (i: number) => i <= activeIndex || reachable[steps[i].key];

  // Footer navigation per step (Back / primary action).
  const footer: {
    onBack?: () => void;
    onNext?: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
  } =
    step === "mode"
      ? { onNext: continueFromMode, nextLabel: "Continue →", nextDisabled: !state.mode }
      : step === "boxes"
        ? {
            onBack: () => goTo("mode"),
            onNext: () => enterGiftOptions(state),
            nextLabel: "Continue →",
            nextDisabled: !canContinueBoxes,
          }
        : step === "giftOptions"
          ? {
              onBack: () => goTo("boxes"),
              onNext: continueFromGiftOptions,
              nextLabel: saving ? "Saving…" : "Continue →",
              nextDisabled: saving,
            }
          : step === "recipients"
            ? {
                onBack: () => goTo("giftOptions"),
                onNext: continueFromRecipients,
                nextLabel: saving ? "Saving…" : "Review order →",
                nextDisabled: saving || !canContinueRecipients,
              }
            : { onBack: () => goTo("recipients") };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Step indicator */}
      <div className="flex-none border-b border-[#e8e8e8] bg-white px-16">
        <nav aria-label="Order steps" className="flex h-20 items-center gap-6 overflow-x-auto">
          {steps.map((s, i) => {
            const active = i === activeIndex;
            const done = i < activeIndex;
            const clickable = canGoToIndex(i) && !active;
            return (
              <div key={s.key} className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => clickable && goTo(s.key)}
                  disabled={!clickable && !active}
                  aria-current={active ? "step" : undefined}
                  className={`flex items-center gap-3 ${clickable ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span
                    className={`flex size-7 items-center justify-center rounded-[8px] text-[12px] font-extrabold ${
                      active
                        ? "bg-brand-yellow text-brand-navy"
                        : done
                          ? "bg-brand-navy text-white"
                          : "border border-[#d1d5db] text-[#9ca3af]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`whitespace-nowrap text-[14px] ${
                      active
                        ? "font-bold text-brand-navy"
                        : done
                          ? "font-medium text-brand-navy"
                          : "font-medium text-[#9ca3af]"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <span className="h-px w-10 shrink-0 bg-[#e5e7eb]" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Current step (scrolls) */}
      <div className="flex-1 overflow-y-auto">
        <div
          className={`mx-auto w-full px-16 py-12 ${
            step === "giftOptions" ? "max-w-6xl" : "max-w-4xl"
          }`}
        >
          {step === "mode" && <ModeStep mode={state.mode} onChoose={selectMode} />}

          {step === "boxes" && state.mode && (
            <BoxStep mode={state.mode} products={products} boxes={state.boxes} onChange={setBoxes} />
          )}

          {step === "giftOptions" && (
            <GiftOptionsStep
              brandingOptions={brandingOptions}
              messageCardOptionId={state.messageCardOptionId}
              boxBrandingOptionId={state.boxBrandingOptionId}
              giftTo={state.giftTo}
              giftFrom={state.giftFrom}
              sharedMessage={state.sharedMessage}
              boxViews={views}
              onChange={patchState}
              onEditBoxes={() => goTo("boxes")}
            />
          )}

          {step === "recipients" && state.mode && (
            <RecipientsStep
              mode={state.mode}
              recipients={state.recipients}
              sharedMessage={state.sharedMessage}
              onChange={setRecipients}
            />
          )}

          {step === "summary" && (
            <OrderSummary
              state={state}
              products={products}
              brandingOptions={brandingOptions}
              onEditMode={() => goTo("mode")}
              onEditBoxes={() => goTo("boxes")}
              onEditGiftOptions={() => goTo("giftOptions")}
              onEditRecipients={() => goTo("recipients")}
            />
          )}

          {actionError && (
            <p role="alert" className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </p>
          )}
        </div>
      </div>

      {/* Footer: running total + navigation */}
      <div className="flex-none border-t border-[#e8e8e8] bg-white px-16">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-brand-ink-soft">Order Total:</span>
            <span className="text-[24px] font-extrabold text-brand-navy">
              {formatPrice(totalCents, currency)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {footer.onBack && (
              <button
                type="button"
                onClick={footer.onBack}
                className="rounded-[5px] px-6 py-4 text-[16px] font-bold text-brand-navy transition hover:bg-brand-sand"
              >
                ← Back
              </button>
            )}
            {footer.onNext && (
              <button
                type="button"
                onClick={footer.onNext}
                disabled={footer.nextDisabled}
                className="rounded-[5px] bg-brand-navy px-8 py-4 text-[16px] font-bold text-white transition hover:bg-brand-navy/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {footer.nextLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
