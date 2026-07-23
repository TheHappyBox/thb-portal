"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { BrandingOption, ProductWithRelations } from "@/types/catalog";
import type { BuilderState, OrderMode, RecipientDraft, SelectedBox } from "@/types/order";
import {
  boxesValidForMode,
  brandingById,
  defaultBrandingOption,
  emptyBuilderState,
  firstStepFor,
  loadBuilderState,
  mergeInitialBox,
  orderTotalCents,
  reconcileBoxesForMode,
  recipientsValid,
  recipientToInput,
  resolveBoxes,
  saveBuilderState,
  skipsBoxStep,
  stepsForFlow,
  type BuilderStep,
} from "@/lib/order-builder";
import { formatPrice } from "@/lib/pricing";
import { saveOrderDraft, saveRecipients } from "@/app/orders/actions";
import { AccountMenu } from "@/components/portal/account-menu";
import { BoxStep } from "@/components/order-builder/box-step";
import { BoxPickerModal } from "@/components/order-builder/box-picker-modal";
import { GiftOptionsStep } from "@/components/order-builder/gift-options-step";
import { RecipientsStep } from "@/components/order-builder/recipients-step";
import { OrderSummary } from "@/components/order-builder/order-summary";

type Step = BuilderStep;

/** Warm, progress-signalling heading for the current step. */
function headingFor(step: Step, mode: OrderMode): string {
  switch (step) {
    case "boxes":
      return mode === "single" ? "Pick your box" : "Pick your boxes";
    case "giftOptions":
      return "Make it personal";
    case "recipients":
      return "Who's it going to?";
    case "summary":
      return "Review & pay";
  }
}

/**
 * Order builder (Figma redesign). A full-height column — header, step indicator,
 * the current step scrolling in the middle, and a sticky footer with the running
 * order total + navigation.
 *
 * The single-vs-bulk mode is chosen at the ENTRY POINT and carried in, so the
 * builder never asks: it comes from the resumed draft, else `?mode=`, else
 * single. A single send that arrives with a box skips the Boxes step and instead
 * shows a changeable "You're sending" card on the first step.
 *
 * State is mirrored to sessionStorage; the DRAFT order is written to the database
 * on the first forward step (never on open, so browsing never leaves stray drafts).
 */
export function OrderBuilder({
  products,
  brandingOptions,
  initialBox,
  initialMode,
  initialDraft = null,
  userName,
  companyName,
  email,
  initials,
}: {
  products: ProductWithRelations[];
  brandingOptions: BrandingOption[];
  initialBox: SelectedBox | null;
  /** Mode from the entry point (?mode=); a resumed draft's own mode wins. */
  initialMode: OrderMode;
  initialDraft?: BuilderState | null;
  userName: string;
  companyName: string;
  email: string;
  initials: string;
}) {
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

  /** Seed from a resumed draft, else the entry point (mode + optional box). */
  function seed(): BuilderState {
    if (initialDraft) return initialDraft;
    const base: BuilderState = { ...emptyBuilderState, mode: initialMode };
    const withBox = mergeInitialBox(base, initialBox);
    return { ...withBox, boxes: reconcileBoxesForMode(withBox.boxes, initialMode) };
  }

  const [view, setView] = useState<{
    state: BuilderState;
    step: Step;
    skipBoxes: boolean;
  }>(() => {
    const s = seed();
    const skip = skipsBoxStep(s);
    return { state: s, step: firstStepFor(s, skip), skipBoxes: skip };
  });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const hydrated = useRef(false);

  // One-time hydration. A resumed draft wins outright; otherwise restore from
  // sessionStorage but let the entry point's mode + box take precedence, since
  // the buyer just chose them.
  useEffect(() => {
    let loaded: BuilderState;
    if (initialDraft) {
      loaded = initialDraft;
    } else {
      const stored = loadBuilderState();
      const merged = mergeInitialBox({ ...stored, mode: initialMode }, initialBox);
      loaded = { ...merged, boxes: reconcileBoxesForMode(merged.boxes, initialMode) };
    }
    const skip = skipsBoxStep(loaded);
    const first = firstStepFor(loaded, skip);
    // Gift options may be the opening step — seed its defaults locally (no write).
    const seeded = first === "boxes" ? loaded : withBrandingDefaults(loaded);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration
    setView({ state: seeded, step: first, skipBoxes: skip });
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to sessionStorage after every change (once hydrated).
  useEffect(() => {
    if (hydrated.current) saveBuilderState(view.state);
  }, [view.state]);

  const { state, step, skipBoxes } = view;
  const mode: OrderMode = state.mode ?? "single";

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
  function goTo(next: Step) {
    setView((prev) => ({ ...prev, step: next }));
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

  /** Save the draft and thread its id back in. Used by forward steps + Save draft. */
  async function persistNow(s: BuilderState): Promise<string | null> {
    setSaving(true);
    setActionError(null);
    const orderId = await persistDraft(s);
    setSaving(false);
    if (orderId && s.orderId !== orderId) patchState({ orderId });
    return orderId;
  }

  async function saveDraftNow() {
    const orderId = await persistNow(state);
    if (orderId) toast.success("Draft saved");
  }

  // ---- transitions ----
  async function continueFromBoxes() {
    const next = withBrandingDefaults(state);
    setView((prev) => ({ ...prev, state: next, step: "giftOptions" }));
    await persistNow(next);
  }

  async function continueFromGiftOptions() {
    goTo("recipients");
    await persistNow(state);
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
      ...prev,
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

  // ---- changing the box without a step (single sends that skipped Boxes) ----
  function swapBox(productId: string, variantId: string) {
    patchState({ boxes: [{ productId, variantId, quantity: 1 }] });
    setPickerOpen(false);
  }
  function swapVariant(variantId: string) {
    const current = state.boxes[0];
    if (current) patchState({ boxes: [{ ...current, variantId }] });
  }

  // ---- derived ----
  const views = resolveBoxes(state.boxes, products);
  const messageCard = brandingById(brandingOptions, state.messageCardOptionId);
  const boxBranding = brandingById(brandingOptions, state.boxBrandingOptionId);
  const totalCents = orderTotalCents(views, messageCard, boxBranding);
  const currency = views[0]?.variant.currency ?? "CAD";
  const canContinueBoxes = boxesValidForMode(state.boxes, mode);
  const canContinueRecipients = recipientsValid(state.recipients);

  const steps = stepsForFlow(mode, skipBoxes);
  const activeIndex = steps.findIndex((s) => s.key === step);

  // Going BACK to a visited step is always allowed; going FORWARD only once that
  // step's prerequisites are met.
  const reachable: Record<Step, boolean> = {
    boxes: true,
    giftOptions: canContinueBoxes,
    recipients: canContinueBoxes,
    summary: canContinueRecipients,
  };
  const canGoToIndex = (i: number) => i <= activeIndex || reachable[steps[i].key];

  // Footer navigation, named by destination so the buyer knows where they land.
  const footer: {
    onBack?: () => void;
    onNext?: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
    disabledReason?: string;
  } =
    step === "boxes"
      ? {
          onNext: continueFromBoxes,
          nextLabel: "Continue to Gift options",
          nextDisabled: !canContinueBoxes || saving,
          disabledReason: canContinueBoxes
            ? undefined
            : mode === "single"
              ? "Pick a box to continue"
              : "Add at least one box to continue",
        }
      : step === "giftOptions"
        ? {
            onBack: skipBoxes ? undefined : () => goTo("boxes"),
            onNext: continueFromGiftOptions,
            nextLabel:
              mode === "single" ? "Continue to Recipient" : "Continue to Recipients",
            nextDisabled: saving,
          }
        : step === "recipients"
          ? {
              onBack: () => goTo("giftOptions"),
              onNext: continueFromRecipients,
              nextLabel: "Review order",
              nextDisabled: saving || !canContinueRecipients,
              disabledReason: canContinueRecipients
                ? undefined
                : mode === "single"
                  ? "Add the recipient's name to continue"
                  : "Every recipient needs a name to continue",
            }
          : { onBack: () => goTo("recipients") };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header: exit, the current step's heading, draft controls, account */}
      <header className="flex h-20 flex-none items-center justify-between gap-4 bg-white px-16">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/dashboard"
            aria-label="Exit to dashboard"
            title="Exit to dashboard"
            className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-brand-border-warm text-brand-navy transition hover:bg-brand-sand"
          >
            <X className="size-4" />
          </Link>
          <h1 className="truncate text-[24px] font-extrabold text-brand-navy">
            {headingFor(step, mode)}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-[12px] text-brand-ink-soft lg:inline">
            Drafts save automatically
          </span>
          <button
            type="button"
            onClick={saveDraftNow}
            disabled={saving}
            className="rounded-md border border-brand-navy px-4 py-2 text-[13px] font-bold text-brand-navy transition hover:bg-brand-navy/[0.06] disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <AccountMenu
            initials={initials}
            userName={userName}
            companyName={companyName}
            email={email}
          />
        </div>
      </header>

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
          {step === "boxes" && (
            <BoxStep mode={mode} products={products} boxes={state.boxes} onChange={setBoxes} />
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
              onChangeBox={skipBoxes ? () => setPickerOpen(true) : () => goTo("boxes")}
              onChangeVariant={skipBoxes ? swapVariant : undefined}
            />
          )}

          {step === "recipients" && (
            <RecipientsStep
              mode={mode}
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
              onEditBoxes={() => (skipBoxes ? setPickerOpen(true) : goTo("boxes"))}
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
        <div className="flex h-20 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-brand-ink-soft">Order Total:</span>
            <span className="text-[24px] font-extrabold text-brand-navy">
              {formatPrice(totalCents, currency)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {footer.disabledReason && (
              <span className="hidden text-[13px] text-brand-ink-soft sm:inline">
                {footer.disabledReason}
              </span>
            )}
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
                title={footer.disabledReason}
                className="rounded-[5px] bg-brand-navy px-8 py-4 text-[16px] font-bold text-white transition hover:bg-brand-navy/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {saving ? "Saving…" : footer.nextLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      {pickerOpen && (
        <BoxPickerModal
          products={products}
          selectedProductId={state.boxes[0]?.productId}
          onSelect={swapBox}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
