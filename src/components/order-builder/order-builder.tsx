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
import { saveOrderDraft, saveRecipients } from "@/app/orders/actions";
import { ModeStep } from "@/components/order-builder/mode-step";
import { BoxStep } from "@/components/order-builder/box-step";
import { GiftOptionsStep } from "@/components/order-builder/gift-options-step";
import { RecipientsStep } from "@/components/order-builder/recipients-step";
import { OrderSummary } from "@/components/order-builder/order-summary";
import { OrderTotalBar } from "@/components/order-builder/order-total-bar";
import { Button } from "@/components/ui/button";

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
 * Order builder shell. Holds the in-progress order and mirrors it to
 * sessionStorage. From the gift-options step onward it also persists a DRAFT
 * order to the database via server actions (account-scoped). Guides the buyer
 * through the steps and converges on a review with a correct total.
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
      sharedMessage: s.sharedMessage,
    });
    if (!res.ok) {
      setActionError(res.error);
      return null;
    }
    return res.orderId;
  }

  // ---- transitions ----
  function chooseMode(mode: OrderMode) {
    const next: BuilderState = {
      ...state,
      mode,
      boxes: reconcileBoxesForMode(state.boxes, mode),
    };
    if (skipsBoxStep(next)) {
      void enterGiftOptions(next);
    } else {
      setView({ state: next, step: "boxes" });
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
  const showTotalBar = step === "giftOptions" || step === "recipients";

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

  return (
    <div className="flex flex-col gap-8">
      {/* Persistent, navigable step indicator */}
      <nav
        aria-label="Order steps"
        className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-xl border border-border bg-card p-3"
      >
        {steps.map((s, i) => {
          const active = s.key === step;
          const done = i < activeIndex;
          const clickable = canGoToIndex(i) && !active;
          return (
            <div key={s.key} className="flex items-center">
              <button
                type="button"
                onClick={() => clickable && goTo(s.key)}
                disabled={!clickable && !active}
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm transition-colors ${
                  clickable ? "cursor-pointer hover:bg-muted" : "cursor-default"
                } ${active ? "bg-muted" : ""}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-secondary text-secondary-foreground"
                        : "border border-border text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={
                    active ? "font-medium text-foreground" : "text-muted-foreground"
                  }
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <span className="mx-0.5 text-border" aria-hidden="true">
                  →
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {showTotalBar && <OrderTotalBar totalCents={totalCents} currency={currency} />}

      {step === "mode" && <ModeStep mode={state.mode} onChoose={chooseMode} />}

      {step === "boxes" && state.mode && (
        <BoxStep
          mode={state.mode}
          products={products}
          boxes={state.boxes}
          onChange={setBoxes}
        />
      )}

      {step === "giftOptions" && (
        <GiftOptionsStep
          brandingOptions={brandingOptions}
          messageCardOptionId={state.messageCardOptionId}
          boxBrandingOptionId={state.boxBrandingOptionId}
          sharedMessage={state.sharedMessage}
          onChange={patchState}
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
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {/* Footer navigation */}
      {step === "mode" && (
        <FooterNav
          onNext={() => (skipsBoxStep(state) ? enterGiftOptions(state) : goTo("boxes"))}
          nextLabel="Continue →"
          nextDisabled={!state.mode}
        />
      )}

      {step === "boxes" && (
        <FooterNav
          onBack={() => goTo("mode")}
          onNext={() => enterGiftOptions(state)}
          nextLabel="Continue →"
          nextDisabled={!canContinueBoxes}
        />
      )}

      {step === "giftOptions" && (
        <FooterNav
          onBack={() => goTo("boxes")}
          onNext={continueFromGiftOptions}
          nextLabel={saving ? "Saving…" : "Continue →"}
          nextDisabled={saving}
        />
      )}

      {step === "recipients" && (
        <FooterNav
          onBack={() => goTo("giftOptions")}
          onNext={continueFromRecipients}
          nextLabel={saving ? "Saving…" : "Review order →"}
          nextDisabled={saving || !canContinueRecipients}
        />
      )}
    </div>
  );
}

function FooterNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-t border-border pt-4">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack}>
          ← Back
        </Button>
      ) : (
        <span />
      )}
      <Button type="button" onClick={onNext} disabled={nextDisabled}>
        {nextLabel}
      </Button>
    </div>
  );
}
