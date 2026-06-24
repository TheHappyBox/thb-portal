"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductWithRelations } from "@/types/catalog";
import type { BuilderState, OrderMode, SelectedBox } from "@/types/order";
import {
  boxesValidForMode,
  emptyBuilderState,
  loadBuilderState,
  mergeInitialBox,
  reconcileBoxesForMode,
  saveBuilderState,
} from "@/lib/order-builder";
import { ModeStep } from "@/components/order-builder/mode-step";
import { BoxStep } from "@/components/order-builder/box-step";
import { OrderSummary } from "@/components/order-builder/order-summary";

type Step = "mode" | "boxes" | "summary";

/** Pick the first unfinished step for a given builder state. */
function stepFor(state: BuilderState): Step {
  if (state.mode && boxesValidForMode(state.boxes, state.mode)) return "summary";
  if (state.mode) return "boxes";
  return "mode";
}

/**
 * Where to go once the mode is chosen. The box step is only worth showing when
 * there's a real selection left to make:
 *  - SINGLE with a box already picked (e.g. arrived from the catalog) → nothing
 *    left to choose, so skip straight to review.
 *  - otherwise (no box yet, or MULTIPLE so more boxes can be added) → box step.
 */
function nextStepAfterMode(state: BuilderState): Step {
  if (state.mode === "single" && boxesValidForMode(state.boxes, state.mode)) {
    return "summary";
  }
  return "boxes";
}

/**
 * Order builder shell. Holds the in-progress order (mode + boxes) as INDEPENDENT
 * state — either can be set first, depending on the entry point — and mirrors it
 * to sessionStorage so a refresh doesn't lose work. It guides the buyer through
 * whichever pieces are unset and converges on a review summary. No DB writes yet.
 *
 * `state` and the on-screen `step` are kept in one object so the one-time
 * sessionStorage hydration is a single state update.
 */
export function OrderBuilder({
  products,
  initialBox,
}: {
  products: ProductWithRelations[];
  initialBox: SelectedBox | null;
}) {
  // Seed deterministically (same on server + client) to avoid hydration drift;
  // saved sessionStorage state is merged in after mount.
  const [view, setView] = useState<{ state: BuilderState; step: Step }>(() => ({
    state: mergeInitialBox(emptyBuilderState, initialBox),
    step: "mode",
  }));
  const hydrated = useRef(false);

  // On mount: merge any saved state with the entry-point box, then land on the
  // first unfinished step. A one-time read from an external store (sessionStorage).
  useEffect(() => {
    const loaded = mergeInitialBox(loadBuilderState(), initialBox);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from sessionStorage
    setView({ state: loaded, step: stepFor(loaded) });
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist after every change (once hydrated, so we don't clobber saved state).
  useEffect(() => {
    if (hydrated.current) saveBuilderState(view.state);
  }, [view.state]);

  const { state, step } = view;

  function chooseMode(mode: OrderMode) {
    setView((prev) => {
      const next = { mode, boxes: reconcileBoxesForMode(prev.state.boxes, mode) };
      return { state: next, step: nextStepAfterMode(next) };
    });
  }

  function setBoxes(boxes: SelectedBox[]) {
    setView((prev) => ({ ...prev, state: { ...prev.state, boxes } }));
  }

  function goTo(step: Step) {
    setView((prev) => ({ ...prev, step }));
  }

  const canContinueBoxes = state.mode
    ? boxesValidForMode(state.boxes, state.mode)
    : false;

  const steps: { key: Step; label: string }[] = [
    { key: "mode", label: "Recipients" },
    { key: "boxes", label: "Boxes" },
    { key: "summary", label: "Review" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Step indicator */}
      <ol className="flex items-center gap-2 text-sm">
        {steps.map((s, i) => {
          const active = s.key === step;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  active
                    ? "bg-brand-berry text-white"
                    : "bg-brand-sand text-brand-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className={active ? "font-medium text-brand-ink" : "text-brand-muted"}>
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <span className="mx-1 text-brand-sand">→</span>
              )}
            </li>
          );
        })}
      </ol>

      {step === "mode" && <ModeStep mode={state.mode} onChoose={chooseMode} />}

      {step === "boxes" && state.mode && (
        <BoxStep
          mode={state.mode}
          products={products}
          boxes={state.boxes}
          onChange={setBoxes}
        />
      )}

      {step === "summary" && (
        <OrderSummary
          state={state}
          products={products}
          onEditMode={() => goTo("mode")}
          onEditBoxes={() => goTo("boxes")}
        />
      )}

      {/* Footer navigation for the two editable steps. */}
      {step === "mode" && (
        <div className="flex items-center justify-end border-t border-brand-sand pt-4">
          <button
            type="button"
            onClick={() =>
              setView((prev) => ({ ...prev, step: nextStepAfterMode(prev.state) }))
            }
            disabled={!state.mode}
            className="rounded-md bg-brand-berry px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-berry-dark disabled:opacity-50"
          >
            Continue →
          </button>
        </div>
      )}

      {step === "boxes" && (
        <div className="flex items-center justify-between border-t border-brand-sand pt-4">
          <button
            type="button"
            onClick={() => goTo("mode")}
            className="text-sm text-brand-muted underline transition hover:text-brand-ink"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => goTo("summary")}
            disabled={!canContinueBoxes}
            className="rounded-md bg-brand-berry px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-berry-dark disabled:opacity-50"
          >
            Review order →
          </button>
        </div>
      )}
    </div>
  );
}
