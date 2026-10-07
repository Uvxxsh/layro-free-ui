"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Local utilities                                                            */
/* -------------------------------------------------------------------------- */

export type Cents = number;

const DANGER = {
  bg: "bg-destructive/10",
  edge: "ring-1 ring-inset ring-destructive/20",
  text: "text-destructive",
} as const;

const DURATION = {
  fast: 0.15,
  base: 0.2,
} as const;

const EDGE = "ring-1 ring-inset ring-border/50";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const SOFT = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.8,
} as const;

const SQUIRCLE = "[corner-shape:squircle]";

const TYPE = {
  micro: "11px",
  chip: "12px",
  meta: "12.5px",
  dense: "13px",
  body: "13.5px",
  title: "14px",
  figure: "18px",
} as const;

function cn(...inputs: Array<string | undefined | false | null>) {
  return inputs.filter(Boolean).join(" ");
}

function formatMoney(
  cents: Cents,
  options: {
    currency?: string;
    locale?: string;
    compact?: boolean;
  } = {},
) {
  const {
    currency = "USD",
    locale = "en-US",
    compact = false,
  } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/* -------------------------------------------------------------------------- */
/* Segmented Control                                                          */
/* -------------------------------------------------------------------------- */

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedControlProps<T extends string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
  ...rest
}: SegmentedControlProps<T>) {
  const reduce = useReducedMotion();
  const id = React.useId();
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  function move(from: number, step: number) {
    const next = (from + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      {...rest}
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[10px] bg-muted p-1",
        SQUIRCLE,
        className,
      )}
    >
      {options.map((o, i) => {
        const on = o.value === value;

        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(i, 1);
              } else if (
                e.key === "ArrowLeft" ||
                e.key === "ArrowUp"
              ) {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-[6px] font-medium whitespace-nowrap transition-colors",
              size === "sm" ? "h-6 px-2.5" : "h-8 px-3",
              on
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
              SQUIRCLE,
              FOCUS,
            )}
            style={{
              fontSize: size === "sm" ? TYPE.chip : TYPE.dense,
            }}
          >
            {on && (
              <motion.span
                layoutId={`${id}-thumb`}
                aria-hidden="true"
                transition={reduce ? { duration: 0 } : SOFT}
                className={cn(
                  "absolute inset-0 rounded-[6px] bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_rgb(0_0_0/0.04)] dark:shadow-none",
                  SQUIRCLE,
                )}
              />
            )}

            <span className="relative">{o.label}</span>

            {o.hint && (
              <span
                className={cn(
                  "relative",
                  on
                    ? "text-muted-foreground"
                    : "text-muted-foreground/75",
                )}
                style={{ fontSize: TYPE.micro }}
              >
                {o.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Plan Picker                                                                */
/* -------------------------------------------------------------------------- */

export type BillingInterval = "month" | "year";

export interface PickerPlan {
  id: string;
  name: string;
  blurb?: string;
  monthly: Cents;
  yearly?: Cents;
  features?: string[];
  badge?: string;
}

export type PlanQuote =
  | {
      kind: "charge";
      today: Cents;
      next: Cents;
      nextDate: string;
    }
  | {
      kind: "credit";
      credit: Cents;
      next: Cents;
      nextDate: string;
    }
  | {
      kind: "blocked";
      reason: string;
    }
  | {
      kind: "current";
    };

export interface PlanPickerProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "onChange" | "title"
  > {
  plans: PickerPlan[];
  currentPlanId: string;
  currentInterval?: BillingInterval;
  defaultSelected?: string;
  quote: (
    planId: string,
    interval: BillingInterval,
  ) => PlanQuote;
  onConfirm?: (
    planId: string,
    interval: BillingInterval,
    quote: PlanQuote,
  ) => void;
  currency?: string;
  locale?: string;
  title?: string;
  footnote?: string;
}

function RadioDot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full transition-colors",
        on
          ? "bg-primary"
          : "bg-card ring-[1.5px] ring-inset ring-input",
      )}
      style={{
        transitionDuration: `${DURATION.fast}s`,
      }}
    >
      {on && <span className="size-2 rounded-full bg-card" />}
    </span>
  );
}

export const PlanPicker = React.forwardRef<
  HTMLDivElement,
  PlanPickerProps
>(function PlanPicker(
  {
    plans,
    currentPlanId,
    currentInterval = "month",
    defaultSelected,
    quote,
    onConfirm,
    currency = "USD",
    locale = "en-US",
    title = "Change plan",
    footnote = "Prices exclude tax. Change or cancel any time.",
    className,
    style,
    ...rest
  },
  ref,
) {
  const reduce = useReducedMotion();

  const [interval, setInterval] =
    React.useState<BillingInterval>(currentInterval);

  const [selected, setSelected] =
    React.useState(defaultSelected ?? currentPlanId);

  const hasYearly = plans.some(
    (p) => p.yearly !== undefined,
  );

  const visible = plans.filter(
    (p) =>
      interval === "month" ||
      p.yearly !== undefined,
  );

  const q = quote(selected, interval);

  const m = (
    c: Cents,
    compact = false,
  ) =>
    formatMoney(c, {
      currency,
      locale,
      compact,
    });

  const tenForTwelve =
    hasYearly &&
    plans.every(
      (p) =>
        p.yearly === undefined ||
        p.yearly === p.monthly * 10,
    );

  const selectedPlan = plans.find(
    (p) => p.id === selected,
  );

  const buttonLabel =
    q.kind === "current"
      ? "This is your plan"
      : q.kind === "blocked"
        ? `Switch to ${selectedPlan?.name ?? "plan"}`
        : `Switch to ${
            selectedPlan?.name ?? "plan"
          }${
            interval === "year"
              ? ", yearly"
              : ""
          }`;

  return (
    <div
      ref={ref}
      {...rest}
      style={{
        fontFamily: FONT_STACK,
        ...style,
      }}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-[18px] bg-card",
        SQUIRCLE,
        EDGE,
        "shadow-[0_1px_2px_rgb(0_0_0/0.05)]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3">
        <span
          className="font-semibold text-foreground"
          style={{
            fontSize: TYPE.title,
          }}
        >
          {title}
        </span>

        {hasYearly && (
          <SegmentedControl
            label="Billing period"
            size="sm"
            value={interval}
            onChange={setInterval}
            options={[
              {
                value: "month",
                label: "Monthly",
              },
              {
                value: "year",
                label: "Yearly",
                hint: tenForTwelve
                  ? "2 months free"
                  : undefined,
              },
            ]}
          />
        )}
      </div>

      {/* Plans */}
      <div
        role="radiogroup"
        aria-label="Plans"
        className="flex flex-col gap-2 px-3"
      >
        {visible.map((p) => {
          const on = p.id === selected;
          const isCurrent =
            p.id === currentPlanId &&
            interval === currentInterval;

          const price =
            interval === "year"
              ? (p.yearly as Cents)
              : p.monthly;

          return (
            <div
              key={p.id}
              className={cn(
                "overflow-hidden rounded-[14px] transition-[background-color,box-shadow]",
                SQUIRCLE,
                on
                  ? "bg-card ring-[1.5px] ring-inset ring-primary"
                  : "bg-foreground/5 ring-1 ring-inset ring-border/50 hover:bg-accent",
              )}
              style={{
                transitionDuration: `${DURATION.fast}s`,
              }}
            >
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSelected(p.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left",
                  FOCUS,
                )}
              >
                <span className="pt-px">
                  <RadioDot on={on} />
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="font-semibold text-foreground"
                      style={{
                        fontSize: TYPE.body,
                      }}
                    >
                      {p.name}
                    </span>

                    {isCurrent && (
                      <span
                        className="rounded-[6px] bg-primary px-1.5 py-px font-medium text-primary-foreground"
                        style={{
                          fontSize: TYPE.micro,
                        }}
                      >
                        Current
                      </span>
                    )}

                    {p.badge && !isCurrent && (
                      <span
                        className="rounded-[6px] bg-muted px-1.5 py-px font-medium text-foreground/75"
                        style={{
                          fontSize: TYPE.micro,
                        }}
                      >
                        {p.badge}
                      </span>
                    )}
                  </span>

                  {p.blurb && (
                    <span
                      className="text-muted-foreground"
                      style={{
                        fontSize: TYPE.meta,
                      }}
                    >
                      {p.blurb}
                    </span>
                  )}
                </span>

                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span
                    className="font-semibold tabular-nums text-foreground"
                    style={{
                      fontSize: TYPE.body,
                    }}
                  >
                    {m(price, true)}
                  </span>

                  <span
                    className="tabular-nums text-muted-foreground"
                    style={{
                      fontSize: TYPE.micro,
                    }}
                  >
                    {interval === "year"
                      ? `per year · ${m(
                          Math.round(price / 12),
                        )}/mo`
                      : "per month"}
                  </span>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {on &&
                  p.features &&
                  p.features.length > 0 && (
                    <motion.div
                      initial={
                        reduce
                          ? { opacity: 0 }
                          : {
                              opacity: 0,
                              height: 0,
                            }
                      }
                      animate={
                        reduce
                          ? { opacity: 1 }
                          : {
                              opacity: 1,
                              height: "auto",
                            }
                      }
                      exit={
                        reduce
                          ? { opacity: 0 }
                          : {
                              opacity: 0,
                              height: 0,
                            }
                      }
                      transition={SOFT}
                      className="overflow-hidden"
                    >
                      <ul className="mx-4 flex flex-col gap-2 border-t border-border/50 pt-3 pb-4 pl-8">
                        {p.features.map((f) => (
                          <li
                            key={f}
                            className="flex items-start gap-2 text-foreground/75"
                            style={{
                              fontSize: TYPE.dense,
                            }}
                          >
                            <Check
                              aria-hidden="true"
                              className="mt-[3px] size-[13px] shrink-0 text-muted-foreground/75"
                            />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Quote */}
      <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
        <AnimatePresence
          initial={false}
          mode="wait"
        >
          <motion.div
            key={`${selected}-${interval}`}
            initial={
              reduce
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    y: -3,
                  }
            }
            animate={
              reduce
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    y: 0,
                  }
            }
            exit={{ opacity: 0 }}
            transition={{
              duration: DURATION.base,
            }}
            aria-live="polite"
          >
            {q.kind === "blocked" ? (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-[12px] px-3 py-2.5",
                  DANGER.bg,
                  DANGER.edge,
                  SQUIRCLE,
                )}
              >
                <AlertTriangle
                  aria-hidden="true"
                  className={cn(
                    "mt-[1px] size-[14px] shrink-0",
                    DANGER.text,
                  )}
                />

                <p
                  className={DANGER.text}
                  style={{
                    fontSize: TYPE.meta,
                  }}
                >
                  {q.reason}
                </p>
              </div>
            ) : q.kind === "current" ? (
              <p
                className="text-muted-foreground"
                style={{
                  fontSize: TYPE.dense,
                }}
              >
                You are on {selectedPlan?.name}.
                Pick another plan to see what
                switching costs.
              </p>
            ) : (
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className="text-foreground/75"
                  style={{
                    fontSize: TYPE.dense,
                  }}
                >
                  {q.kind === "charge" ? (
                    <>
                      Today, for the rest of this
                      period · then{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {m(q.next)}
                      </span>{" "}
                      on {q.nextDate}
                    </>
                  ) : (
                    <>
                      Credited to your next invoice ·
                      then{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {m(q.next)}
                      </span>{" "}
                      on {q.nextDate}
                    </>
                  )}
                </p>

                <span
                  className="shrink-0 font-semibold tabular-nums tracking-[-0.02em] text-foreground"
                  style={{
                    fontSize: TYPE.figure,
                  }}
                >
                  {q.kind === "charge"
                    ? m(q.today)
                    : `−${m(q.credit)}`}
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          disabled={
            q.kind === "current" ||
            q.kind === "blocked"
          }
          onClick={() =>
            onConfirm?.(
              selected,
              interval,
              q,
            )
          }
          className={cn(
            "h-10 w-full rounded-[10px] font-medium transition-colors",
            q.kind === "current" ||
              q.kind === "blocked"
              ? "cursor-not-allowed bg-muted text-muted-foreground/75"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
            SQUIRCLE,
            FOCUS,
          )}
          style={{
            fontSize: TYPE.body,
            transitionDuration: `${DURATION.fast}s`,
          }}
        >
          {buttonLabel}
        </button>

        {footnote && (
          <p
            className="text-center text-muted-foreground/75"
            style={{
              fontSize: TYPE.micro,
            }}
          >
            {footnote}
          </p>
        )}
      </div>
    </div>
  );
});

PlanPicker.displayName = "PlanPicker";

export default PlanPicker;
