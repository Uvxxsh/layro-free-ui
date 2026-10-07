"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/* ==========================================================================
   Local utilities
   ========================================================================== */

const DURATION = {
  fast: 0.15,
} as const;

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const SOFT = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.8,
} as const;

const SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.8,
} as const;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ==========================================================================
   Thinking State

   The gap between sending a question and the first word of the answer.

     <ThinkingState detail="Reading 12 invoices" />

   A spinner says "wait". This says what is being waited for, which is the
   difference between a pause that feels broken at four seconds and one that
   is fine at fifteen:

     label     what is happening, in one word: Thinking, Searching, Writing
     detail    the step it is on right now, replaced as it moves on
     steps     the trail so far, folded away until someone wants it
     seconds   counted while it runs, then kept: "Thought for 6s"

   When `done` turns true it stops moving and stays in the thread as a record
   of what was done, so the reasoning behind an answer is one click away.
   ========================================================================== */

export interface ThinkingStep {
  label: string;
  /** Default: every step but the last is done, the last is active. */
  status?: "done" | "active" | "pending";
}

export interface ThinkingStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** One word for what is happening. Default "Thinking". */
  label?: string;

  /** What it is doing right now. Changes are crossfaded. */
  detail?: string;

  /** The trail so far. With steps, the row becomes a button that unfolds them. */
  steps?: ThinkingStep[];

  /** Finished. Stops the motion and reads "Thought for 6s". */
  done?: boolean;

  /** Seconds taken. Counted from mount when left out. */
  seconds?: number;

  /** `shimmer` sweeps the label, `dots` bounce beside it, `pulse` breathes the mark. Default `shimmer`. */
  variant?: "shimmer" | "dots" | "pulse";

  /** Whether the steps start unfolded. Default false. */
  defaultOpen?: boolean;

  open?: boolean;

  onOpenChange?: (open: boolean) => void;
}

const SHEEN =
  "bg-[linear-gradient(110deg,var(--muted-foreground)_38%,var(--foreground)_50%,var(--muted-foreground)_62%)] bg-[length:220%_100%] bg-clip-text text-transparent motion-safe:animate-shimmer";

export const ThinkingState = React.forwardRef<
  HTMLDivElement,
  ThinkingStateProps
>(function ThinkingState(
  {
    label = "Thinking",
    detail,
    steps,
    done = false,
    seconds,
    variant = "shimmer",
    defaultOpen = false,
    open: openProp,
    onOpenChange,
    className,
    ...props
  },
  ref,
) {
  const reduce = useReducedMotion();

  const [inner, setInner] = React.useState(defaultOpen);

  const open = openProp ?? inner;

  const setOpen = (v: boolean) => {
    setInner(v);
    onOpenChange?.(v);
  };

  const panelId = React.useId();

  /* Count from mount unless the caller is keeping the time. */
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (done || seconds !== undefined) return;

    const started = Date.now() - elapsed * 1000;

    const t = setInterval(
      () =>
        setElapsed(
          Math.floor((Date.now() - started) / 1000),
        ),
      250,
    );

    return () => clearInterval(t);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, seconds]);

  const took = seconds ?? elapsed;

  const has = Boolean(steps && steps.length);

  const text = done ? `Thought for ${took}s` : label;

  const row = (
    <>
      <span className="relative grid size-4 shrink-0 place-items-center">
        {done ? (
          <motion.span
            initial={reduce ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING}
            className="grid size-4 place-items-center rounded-full bg-foreground/10"
          >
            <Check aria-hidden className="size-2.5" />
          </motion.span>
        ) : variant === "dots" ? (
          <span
            aria-hidden
            className="flex items-center gap-[3px]"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  animationDelay: `${i * 0.16}s`,
                }}
                className="size-1 rounded-full bg-foreground/70 motion-safe:animate-dot"
              />
            ))}
          </span>
        ) : (
          <motion.span
            aria-hidden
            animate={
              reduce
                ? undefined
                : variant === "pulse"
                  ? {
                      scale: [1, 1.25, 1],
                      opacity: [0.6, 1, 0.6],
                    }
                  : {
                      rotate: [0, 14, -8, 0],
                    }
            }
            transition={{
              duration: variant === "pulse" ? 1.4 : 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="grid place-items-center"
          >
            <Sparkles className="size-3.5" />
          </motion.span>
        )}
      </span>

      <span
        className={cn(
          "font-medium",
          !done && variant === "shimmer"
            ? SHEEN
            : done
              ? "text-muted-foreground"
              : "text-foreground",
        )}
      >
        {text}
      </span>

      {!done && (
        <span className="relative min-w-0 flex-1 overflow-hidden text-muted-foreground">
          <AnimatePresence
            mode="wait"
            initial={false}
          >
            {detail && (
              <motion.span
                key={detail}
                initial={
                  reduce
                    ? false
                    : {
                        opacity: 0,
                        y: 8,
                      }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={
                  reduce
                    ? {
                        opacity: 0,
                      }
                    : {
                        opacity: 0,
                        y: -8,
                      }
                }
                transition={{
                  duration: DURATION.fast,
                }}
                className="block truncate"
              >
                {detail}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      )}

      {!done && took >= 3 && (
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {took}s
        </span>
      )}

      {has && (
        <motion.span
          aria-hidden
          animate={{
            rotate: open ? 180 : 0,
          }}
          transition={SPRING}
          className="ml-auto shrink-0 text-muted-foreground"
        >
          <ChevronDown className="size-3.5" />
        </motion.span>
      )}
    </>
  );

  return (
    <div
      ref={ref}
      data-state={done ? "done" : "thinking"}
      className={cn(
        "w-full text-[12.5px] text-foreground",
        className,
      )}
      {...props}
    >
      {has ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className={cn(
            "-mx-1.5 flex w-[calc(100%+0.75rem)] cursor-pointer items-center gap-2 rounded-[8px] px-1.5 py-1 text-left transition-colors hover:bg-accent",
            FOCUS,
          )}
        >
          {row}
        </button>
      ) : (
        <div className="flex items-center gap-2 py-1">
          {row}
        </div>
      )}

      {/* Announced once per change of label, not on every tick of the timer. */}
      <span
        role="status"
        className="sr-only"
      >
        {done
          ? `Finished thinking in ${took} seconds`
          : detail
            ? `${label}: ${detail}`
            : label}
      </span>

      <AnimatePresence initial={false}>
        {has && open && (
          <motion.div
            id={panelId}
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={
              reduce
                ? {
                    duration: 0,
                  }
                : SOFT
            }
            className="overflow-hidden"
          >
            <ol className="mt-1 ml-[7px] flex flex-col gap-1.5 border-l border-border py-1 pl-4">
              <AnimatePresence initial={false}>
                {steps!.map((s, i) => {
                  const status =
                    s.status ??
                    (done || i < steps!.length - 1
                      ? "done"
                      : "active");

                  return (
                    <motion.li
                      key={s.label}
                      layout={!reduce}
                      initial={
                        reduce
                          ? false
                          : {
                              opacity: 0,
                              x: -6,
                            }
                      }
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={SPRING}
                      className="relative flex items-start gap-2 leading-snug"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-[5px] -left-[20.5px] size-2 rounded-full ring-2 ring-background",
                          status === "done"
                            ? "bg-foreground/45"
                            : status === "active"
                              ? "bg-foreground motion-safe:animate-pulse"
                              : "bg-border",
                        )}
                      />

                      <span
                        className={
                          status === "pending"
                            ? "text-muted-foreground/70"
                            : status === "active"
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }
                      >
                        {s.label}
                      </span>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ThinkingState.displayName = "ThinkingState";

export default ThinkingState;
