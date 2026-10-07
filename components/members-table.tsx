"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Crown,
  Minus,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/* ==========================================================================
   Local utilities
   ========================================================================== */

const FONT_STACK =
  'var(--font-sans, "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif)';

const TYPE = {
  title: 15,
  body: 13.5,
  sub: 13,
  dense: 12.5,
  meta: 11.5,
  chip: 11,
  micro: 10.5,
  figure: 27,
} as const;

const SQUIRCLE = "[corner-shape:squircle]";

const EDGE = "ring-1 ring-inset ring-border";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const DURATION = {
  fast: 0.12,
  base: 0.18,
  slow: 0.26,
} as const;

const SOFT = { type: "spring", stiffness: 300, damping: 30 } as const;

const DANGER = {
  text: "text-destructive",
  bg: "bg-destructive/10",
  edge: "ring-1 ring-inset ring-destructive/20",
  solid:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive/60 dark:hover:bg-destructive/70",
} as const;

const PREMIUM = {
  text: "text-warning",
  bg: "bg-warning/10",
  edge: "ring-1 ring-inset ring-warning/20",
  solid: "bg-warning-fill text-warning-foreground hover:bg-warning-fill/90",
} as const;

const LAYER = {
  popover: 60,
  dialog: 70,
  toast: 80,
} as const;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Renders children into document.body once mounted, so SSR and hydration match. */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/* -------------------------------------------------------------------------- */
/*  Dismiss + scroll lock                                                       */
/*                                                                              */
/*  Every dialog and popover in the set had its own copy of "close on Escape,    */
/*  close on outside click", and each copy had drifted. These are the two that   */
/*  behave correctly, including the cases the hand-rolled versions missed:       */
/*  pointer capture, nested surfaces, and the scrollbar-width layout shift.      */
/* -------------------------------------------------------------------------- */

interface DismissOptions {
  /** Whether the surface is open and should listen. */
  active?: boolean;
  /** Close on Escape. Default true. */
  escapeKey?: boolean;
  /** Close on a pointer press outside the surface. Default true. */
  outsidePress?: boolean;
  /**
   * The trigger. Presses on it are ignored, so a click on an open toggle
   * closes it once via its own handler rather than closing and reopening.
   */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Closes a surface on Escape or an outside press.
 *
 * ```tsx
 * useDismiss(panelRef, () => setOpen(false), { active: open, triggerRef });
 * ```
 */
function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
  {
    active = true,
    escapeKey = true,
    outsidePress = true,
    triggerRef,
  }: DismissOptions = {},
) {
  // Held in a ref so a caller passing an inline arrow doesn't re-bind the
  // listeners on every render.
  const handler = React.useRef(onDismiss);
  React.useEffect(() => {
    handler.current = onDismiss;
  });

  React.useEffect(() => {
    if (!active) return;

    function onKeyDown(e: KeyboardEvent) {
      if (!escapeKey || e.key !== "Escape") return;
      // With two surfaces open, only the innermost should close. Whoever
      // handled it first marks the event.
      if (e.defaultPrevented) return;
      e.preventDefault();
      handler.current();
    }

    function onPointerDown(e: PointerEvent) {
      if (!outsidePress) return;
      const target = e.target as Node | null;
      if (!target) return;
      // A press that starts inside and drags out — selecting text across the
      // edge of a dialog — should not dismiss.
      if (ref.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      // The node may already be detached (a row removed by the same click),
      // in which case it was inside when the press began.
      if (!document.body.contains(target)) return;
      handler.current();
    }

    document.addEventListener("keydown", onKeyDown);
    // `pointerdown` rather than `click`: a menu should close as the press
    // lands, not when the button comes back up somewhere else.
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [active, escapeKey, outsidePress, ref, triggerRef]);
}

/* ==========================================================================
   Building blocks used by the members table
   ========================================================================== */

/* ------------------------------------------------------------------ avatar -- */

/* ==========================================================================
   Avatar

   A person, drawn rather than initialled.

   Initials are the usual fallback and they are the weakest part of most
   interfaces: "PR" in a coloured square tells you a slot is filled, not who is
   in it. At pin size — 26px on a document — two letters are unreadable anyway.
   A drawn face is recognisable at that size, stays the same for the same
   person, and never shows a broken image.

   The portrait is derived from the seed, so Priya Raman is always the same
   Priya Raman across the pin, the thread, the signer list and the audit trail.
   Pass `src` and a real photo wins; the drawing is what stands in until then.
   ========================================================================== */

const SKIN = ["#f4d9c0", "#e8b894", "#cf9367", "#a2673f", "#79482a"];
const HAIR = ["#2b2622", "#6b4423", "#a8552c", "#d9a441", "#5c5c5c", "#171717"];
const SHIRT = [
  "#6478e4",
  "#df6072",
  "#3fa66a",
  "#e1a35b",
  "#8a63d2",
  "#3f9fb3",
];
const BACKDROP = ["#eef1f4", "#f2eee9", "#eaf1ee", "#f1edf5", "#f3f0e8"];

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Six hair shapes, drawn over the head. */
function Hair({ variant, fill }: { variant: number; fill: string }) {
  switch (variant % 6) {
    case 0:
      return (
        <path
          d="M27 44c0-14 10-22 23-22s23 8 23 22c0-6-8-9-23-9s-23 3-23 9Z"
          fill={fill}
        />
      );
    case 1:
      return (
        <g fill={fill}>
          <circle cx="34" cy="28" r="9" />
          <circle cx="50" cy="23" r="10" />
          <circle cx="66" cy="28" r="9" />
          <circle cx="28" cy="40" r="7" />
          <circle cx="72" cy="40" r="7" />
        </g>
      );
    case 2:
      return (
        <path
          d="M26 46c0-16 11-24 24-24s24 8 24 24v30c0 4-4 6-7 4 2-14 1-24-1-30-4 4-11 6-16 6s-12-2-16-6c-2 6-3 16-1 30-3 2-7 0-7-4V46Z"
          fill={fill}
        />
      );
    case 3:
      return (
        <g fill={fill}>
          <circle cx="50" cy="15" r="8" />
          <path d="M27 44c0-14 10-22 23-22s23 8 23 22c0-7-9-11-23-11s-23 4-23 11Z" />
        </g>
      );
    case 4:
      return (
        <path
          d="M26 47c0-15 11-25 24-25s24 10 24 25c-2-9-9-14-18-14-6 0-10 2-16 6-5 3-10 5-14 8Z"
          fill={fill}
        />
      );
    default:
      return (
        <path
          d="M26 47c0-16 11-25 24-25s24 9 24 25v12c0 3-4 4-6 2 1-8 1-14 0-18-5 4-11 6-18 6s-13-2-18-6c-1 4-1 10 0 18-2 2-6 1-6-2V47Z"
          fill={fill}
        />
      );
  }
}

interface AvatarProps {
  /** Stable identity — an email is ideal. Same seed, same face, forever. */
  seed: string;
  /** A real photo. Wins over the drawing; falls back to it if it fails. */
  src?: string;
  /** For the alt text and the title attribute. */
  name?: string;
  /** Pixel size. 20–44 are the sizes the set actually uses. */
  size?: number;
  /**
   * Circular by default, matching Share Dialog and Notification Panel — the
   * set has always drawn people as circles and objects as squircles, and a
   * squircle face reads as a file tile. Squircle stays available for the rare
   * case where an avatar sits in a grid of tiles.
   */
  shape?: "circle" | "squircle";
  /** A hairline, for a pale face against a pale surface. */
  ring?: boolean;
  className?: string;
}

function Avatar({
  seed,
  src,
  name,
  size = 28,
  shape = "circle",
  ring = true,
  className,
}: AvatarProps) {
  const [broken, setBroken] = React.useState(false);
  const h = hash(seed);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const shirt = SHIRT[(h >> 6) % SHIRT.length];
  const backdrop = BACKDROP[(h >> 9) % BACKDROP.length];
  const shade = `color-mix(in srgb, ${skin} 86%, #000)`;

  /* People are round. For the squircle variant the radius tracks the size — a
     20px tile should not be as round as a 40px one — but it snaps to the set's
     radius scale rather than computing freely, or a 36px avatar lands on 11px
     and quietly breaks the scale. */
  const STEPS = [6, 7, 8, 9, 10, 12, 14, 18];
  const wanted = size * 0.3;
  const radius =
    shape === "circle"
      ? "9999px"
      : `${STEPS.reduce((a, b) => (Math.abs(b - wanted) < Math.abs(a - wanted) ? b : a))}px`;

  const frame = cn(
    // `inline-grid`, not the default: a <span> is display:inline, and an inline
    // element ignores width and height outright — so without this the SVG sizes
    // the avatar instead of the other way round, and a 28px pin renders at 300px.
    "relative inline-grid shrink-0 overflow-hidden bg-muted",
    ring && "ring-1 ring-inset ring-border/65",
    shape === "squircle" && SQUIRCLE,
    className,
  );

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        title={name}
        onError={() => setBroken(true)}
        style={{ width: size, height: size, borderRadius: radius }}
        className={cn(frame, "object-cover")}
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size, borderRadius: radius }}
      className={frame}
      title={name}
    >
      <svg viewBox="0 0 100 106" aria-hidden className="h-full w-full">
        <rect width="100" height="106" fill={backdrop} />
        <path d="M12 106c0-23 17-34 38-34s38 11 38 34Z" fill={shirt} />
        <path d="M42 73h16l-8 10Z" fill={backdrop} opacity="0.5" />
        <path d="M42 60h16v14a8 8 0 0 1-16 0Z" fill={shade} />
        <circle cx="27" cy="47" r="4.5" fill={skin} />
        <circle cx="73" cy="47" r="4.5" fill={skin} />
        <ellipse cx="50" cy="45" rx="22" ry="24.5" fill={skin} />
        <Hair variant={h >> 12} fill={hair} />
        <ellipse cx="42" cy="46" rx="1.9" ry="2.4" fill="#2b2622" />
        <ellipse cx="58" cy="46" rx="1.9" ry="2.4" fill="#2b2622" />
        <path
          d="M44 54c2 2.4 10 2.4 12 0"
          stroke="#2b2622"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
      </svg>
      {name && <span className="sr-only">{name}</span>}
    </span>
  );
}

/**
 * Overlapping avatars with a +N tail.
 *
 * Used where a group is the subject rather than an individual — a clustered
 * pin at low zoom, or the people on one phase of a plan.
 */
function AvatarStack({
  people,
  size = 24,
  max = 3,
  className,
}: {
  people: Array<{ seed: string; src?: string; name?: string }>;
  size?: number;
  max?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className={cn("flex items-center", className)}>
      {shown.map((p, i) => (
        <span
          key={p.seed + i}
          style={{ marginLeft: i === 0 ? 0 : -size * 0.32 }}
        >
          <Avatar {...p} size={size} className="ring-2 ring-card" />
        </span>
      ))}
      {rest > 0 && (
        <span
          style={{ width: size, height: size, marginLeft: -size * 0.32 }}
          className={cn(
            "grid shrink-0 place-items-center rounded-full bg-muted-foreground/20 text-[10px] font-semibold text-foreground/75",
            "ring-2 ring-card",
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ role chip -- */

/* ==========================================================================
   RoleChip

   What a person may do, as a label.

   Six components in this kit render a role, and before this file each of them
   would have carried its own copy of the labels, the tints and the rule about
   owners. That is exactly the drift the shared lib was created to stop: one
   component says "Can edit", the next says "Editor", and the buyer has to
   reconcile them.

   Two rules live here rather than in any component that uses it.

   Owner is a station, not a setting. It can be displayed but never offered in
   a picker, because the only honest way to move it is a transfer flow that
   states what the current owner loses. `ASSIGNABLE_ROLES` is what a menu is
   allowed to show; `ROLES` is what may be drawn.

   Role is never colour alone. Each chip carries its word, and the tint only
   ranks them — an admin badge that reads as "the blue one" is illegible to
   anyone who cannot separate the hues, and invisible in a screenshot.
   ========================================================================== */

/* ---------------------------------------------------------------- types -- */

/** Every role the kit knows about, most privileged first. */
export type Role = "owner" | "admin" | "member" | "viewer" | "guest";

/** Everything a picker may offer. Owner is deliberately absent. */
export type AssignableRole = Exclude<Role, "owner">;

export const ROLES: readonly Role[] = [
  "owner",
  "admin",
  "member",
  "viewer",
  "guest",
] as const;

/**
 * What a role menu is allowed to contain.
 *
 * Owner is excluded on purpose: granting it silently would leave two owners or
 * none, and neither state has an obvious meaning. Transfer Ownership is the
 * component that changes it, and it asks for the workspace name to be typed.
 */
export const ASSIGNABLE_ROLES: readonly AssignableRole[] = [
  "admin",
  "member",
  "viewer",
  "guest",
] as const;

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
  guest: "Guest",
};

/**
 * One line each, for a picker or a tooltip. Written from the reader's side:
 * what this person can do, not which flag is set on the record.
 */
export const ROLE_HINT: Record<Role, string> = {
  owner: "Full control, including billing and transfer",
  admin: "Manage people and settings",
  member: "Create and edit, but not manage people",
  viewer: "Read and comment only",
  guest: "Outside the organisation, access expires",
};

/**
 * The chips are neutral, and rank by weight rather than by hue.
 *
 * The set uses colour semantically and sparingly — emerald for something
 * resolved, red for something destructive — never as chrome. A role is not a
 * status: nothing about being a Viewer is good or bad, so painting the four
 * of them four colours adds decoration and one more thing to learn. They rank
 * by how filled they are instead, which survives a greyscale screenshot and
 * does not compete with the one place colour has to be noticed.
 *
 * Owner is still separable at a glance, by the crown rather than by amber.
 * Guest is outlined rather than filled, so an outsider reads differently from
 * staff in a list without being a different colour.
 */
const TINT: Record<Role, string> = {
  owner: "bg-primary text-primary-foreground",
  admin: "bg-foreground/10 text-foreground",
  member: "bg-muted text-foreground/75",
  viewer: "bg-muted text-muted-foreground",
  guest: "bg-transparent text-muted-foreground ring-1 ring-inset ring-border",
};

const SIZES = {
  sm: { fontSize: TYPE.micro, padding: "1.5px 6px", radius: 6, icon: 10 },
  md: { fontSize: TYPE.chip, padding: "2.5px 7px", radius: 7, icon: 11 },
} as const;

export interface RoleChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  role: Role;
  /** `sm` for dense table rows, `md` for cards and dialogs. Default `md`. */
  size?: keyof typeof SIZES;
  /**
   * Draw the crown on an owner. Default true.
   *
   * Turn it off only where the crown already appears next to the name, so the
   * same fact is not stated twice in one row.
   */
  showOwnerMark?: boolean;
}

/* ------------------------------------------------------------ component -- */

export const RoleChip = React.forwardRef<HTMLSpanElement, RoleChipProps>(
  function RoleChip(
    { role, size = "md", showOwnerMark = true, className, style, ...rest },
    ref,
  ) {
    const s = SIZES[size];

    return (
      <span
        ref={ref}
        {...rest}
        className={cn(
          "inline-flex max-w-full items-center gap-1 whitespace-nowrap font-medium",
          SQUIRCLE,
          TINT[role],
          className,
        )}
        style={{
          fontSize: s.fontSize,
          padding: s.padding,
          borderRadius: s.radius,
          ...style,
        }}
      >
        {role === "owner" && showOwnerMark && (
          <Crown
            aria-hidden="true"
            style={{ width: s.icon, height: s.icon }}
            className="shrink-0"
          />
        )}
        <span className="truncate">{ROLE_LABEL[role]}</span>
      </span>
    );
  },
);

/* ------------------------------------------------------------------ menu -- */

/* ==========================================================================
   Menu

   The list behind a "…" button.

   Every row component in this kit ends in an overflow button, and until this
   file each of them either did nothing on click or opened a native `<select>`
   wearing a costume. Both are wrong in the same way: the actions a row offers
   are the row's real content — "resend this invite", "end this access" — and
   hiding them behind a control that cannot show a description, cannot mark a
   destructive item and cannot be styled to match is how a kit ends up looking
   assembled rather than designed.

   Three decisions live here.

   It portals. A member card clips its own overflow so a long name truncates;
   a menu rendered inside that card would be cut off at the card's edge. The
   list is therefore rendered to the document and positioned against the
   trigger's rect, and it flips above the trigger when the space below is
   short rather than opening off-screen.

   Destructive items are last, separated, and red. "Remove from workspace"
   sitting directly under "Copy email" is how a row gets deleted by a slipped
   click. The separator is not decoration — it is the distance.

   Focus goes into the list and comes back. Opening moves focus to the first
   item, arrows move between them, Escape closes and returns focus to the
   button that opened it. A menu you can open with the keyboard but not close
   with it is worse than no menu.
   ========================================================================== */

/* ---------------------------------------------------------------- types -- */

interface MenuItem {
  /** Stable identity, returned to `onSelect`. */
  id: string;
  /** The action, phrased as a verb from the reader's side. */
  label: string;
  /** One line of consequence, shown under the label. Optional. */
  hint?: string;
  /** Leading glyph. Any lucide icon, or anything taking `className`. */
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /**
   * Draws the item in red and moves the separator above it.
   *
   * Reserved for actions that cannot be undone from this surface — removing a
   * person, ending an access, cancelling an invite.
   */
  danger?: boolean;
  /** Present but unavailable. Kept visible so the reader knows it exists. */
  disabled?: boolean;
  /** Draws a check on the right. For items that report a current setting. */
  checked?: boolean;
  /** Forces a rule above this item even when it is not destructive. */
  separatorBefore?: boolean;
}

interface MenuProps {
  items: MenuItem[];
  /** Fired with the item's `id`. The menu closes first, then this runs. */
  onSelect?: (id: string, item: MenuItem) => void;
  /** `end` hangs the list off the trigger's right edge. Default `end`. */
  align?: "start" | "end";
  /** Accessible name for the default trigger button. */
  triggerLabel?: string;
  /** Width of the list in px. Default 208. */
  width?: number;
  /**
   * Replace the default "…" button.
   *
   * Receives the props the trigger must carry — a ref, the open state and the
   * ARIA wiring — so a custom trigger stays keyboard-correct.
   */
  trigger?: (props: {
    ref: React.Ref<HTMLButtonElement>;
    open: boolean;
    onClick: (e: React.MouseEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
  }) => React.ReactNode;
  className?: string;
}

/* -------------------------------------------------------------- helpers -- */

/** Gap between the trigger and the list, in px. */
const OFFSET = 6;
/** Keep the list this far from the viewport edge. */
const MARGIN = 8;

function firstEnabled(items: MenuItem[], from = 0, step = 1) {
  for (let i = from; i >= 0 && i < items.length; i += step) {
    if (!items[i].disabled) return i;
  }
  return -1;
}

/* ------------------------------------------------------------ component -- */

const Menu = React.forwardRef<HTMLButtonElement, MenuProps>(function Menu(
  {
    items,
    onSelect,
    align = "end",
    triggerLabel = "More options",
    width = 208,
    trigger,
    className,
  },
  forwardedRef,
) {
  const reduce = useReducedMotion();

  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [pos, setPos] = React.useState<{
    top: number;
    left: number;
    up: boolean;
  } | null>(null);

  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useImperativeHandle(
    forwardedRef,
    () => triggerRef.current as HTMLButtonElement,
  );

  const close = React.useCallback((restoreFocus = true) => {
    setOpen(false);
    setActive(-1);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useDismiss(listRef, () => close(false), { active: open, triggerRef });

  /* Position against the trigger's rect rather than against a parent, because
     the parent is usually a card with `overflow-hidden`. Measured on open and
     again on scroll or resize, since a fixed-position list does not follow a
     page that moves under it. */
  const place = React.useCallback(() => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const h = listRef.current?.offsetHeight ?? 0;
    const below = window.innerHeight - r.bottom - OFFSET - MARGIN;
    const up = h > 0 && below < h && r.top - OFFSET - MARGIN > h;

    let left = align === "end" ? r.right - width : r.left;
    left = Math.min(Math.max(MARGIN, left), window.innerWidth - width - MARGIN);

    setPos({ top: up ? r.top - OFFSET - h : r.bottom + OFFSET, left, up });
  }, [align, width]);

  React.useLayoutEffect(() => {
    if (!open) return;
    place();
    const onScroll = () => place();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, place, items.length]);

  /* Focus lands on the list itself rather than on an item, so a screen reader
     announces the menu before its first option. Arrow keys move `active` from
     there. */
  React.useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  function openWith(index: number) {
    setOpen(true);
    setActive(index);
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openWith(firstEnabled(items));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openWith(firstEnabled(items, items.length - 1, -1));
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      let next = firstEnabled(items, active + step, step);
      if (next === -1)
        next = firstEnabled(items, step === 1 ? 0 : items.length - 1, step);
      setActive(next);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(firstEnabled(items));
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(firstEnabled(items, items.length - 1, -1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const item = items[active];
      if (item && !item.disabled) pick(item);
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  function pick(item: MenuItem) {
    close();
    onSelect?.(item.id, item);
  }

  const triggerProps = {
    ref: triggerRef,
    open,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (open) close();
      else openWith(-1);
    },
    onKeyDown: onTriggerKeyDown,
    "aria-haspopup": "menu" as const,
    "aria-expanded": open,
  };

  return (
    <>
      {trigger ? (
        trigger(triggerProps)
      ) : (
        <button
          type="button"
          ref={triggerRef}
          aria-label={triggerLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={triggerProps.onClick}
          onKeyDown={onTriggerKeyDown}
          className={cn(
            "grid size-[28px] shrink-0 place-items-center rounded-[8px]",
            "text-muted-foreground/75 transition-colors hover:bg-accent hover:text-foreground/90",
            open && "bg-muted text-foreground/90",
            SQUIRCLE,
            FOCUS,
            className,
          )}
          style={{ transitionDuration: `${DURATION.fast}s` }}
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </button>
      )}

      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={listRef}
              role="menu"
              tabIndex={-1}
              aria-label={triggerLabel}
              onKeyDown={onListKeyDown}
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.97, y: pos?.up ? 4 : -4 }
              }
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.98, y: pos?.up ? 2 : -2 }
              }
              transition={{ duration: DURATION.base }}
              style={{
                position: "fixed",
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                width,
                zIndex: LAYER.popover,
                fontFamily: FONT_STACK,
                transformOrigin: pos?.up ? "bottom right" : "top right",
                visibility: pos ? "visible" : "hidden",
              }}
              className={cn(
                "overflow-hidden rounded-[14px] bg-card p-[5px]",
                "shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.12)]",
                SQUIRCLE,
                EDGE,
                FOCUS,
              )}
            >
              {items.map((item, i) => {
                const Icon = item.icon;
                const rule =
                  item.separatorBefore ||
                  (item.danger && i > 0 && !items[i - 1].danger);
                return (
                  <React.Fragment key={item.id}>
                    {rule && (
                      <div
                        aria-hidden="true"
                        className="my-[5px] h-px bg-foreground/5"
                      />
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      tabIndex={-1}
                      onMouseEnter={() => !item.disabled && setActive(i)}
                      onClick={(e) => {
                        e.stopPropagation();
                        pick(item);
                      }}
                      className={cn(
                        "flex w-full items-center gap-[9px] rounded-[9px] px-[9px] py-[7px] text-left",
                        "transition-colors",
                        SQUIRCLE,
                        item.disabled
                          ? "cursor-not-allowed text-muted-foreground/50"
                          : item.danger
                            ? cn(DANGER.text, active === i && DANGER.bg)
                            : cn(
                                "text-foreground/90",
                                active === i && "bg-muted",
                              ),
                      )}
                      style={{ transitionDuration: `${DURATION.fast}s` }}
                    >
                      {Icon && (
                        <Icon
                          aria-hidden
                          className={cn(
                            "size-[15px] shrink-0",
                            !item.danger &&
                              !item.disabled &&
                              "text-muted-foreground/75",
                          )}
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span
                          className="block truncate font-medium"
                          style={{ fontSize: TYPE.sub }}
                        >
                          {item.label}
                        </span>
                        {item.hint && (
                          <span
                            className="mt-[1px] block truncate font-normal text-muted-foreground/75"
                            style={{ fontSize: TYPE.micro }}
                          >
                            {item.hint}
                          </span>
                        )}
                      </span>
                      {item.checked && (
                        <Check
                          aria-hidden="true"
                          className="size-[14px] shrink-0 text-muted-foreground"
                        />
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
});

/* ==========================================================================
   MembersTable

   Everyone in the workspace, and the things you do to more than one of them
   at a time.

   A members table is where an admin goes when the job is plural: offboard the
   contractors, move the whole design team to Member, clear out everyone who
   never accepted. So the table is not the interesting part — the bulk bar is.

   And the bulk bar is where these interfaces fail. You tick twelve rows, pick
   "Change role → Viewer", and the product runs it against all twelve: ten
   succeed, the owner is silently skipped, and you are the twelfth so your own
   session just lost its admin rights. What you get is a red toast afterwards
   saying "10 of 12 updated", which tells you something went wrong but not
   what, and leaves you to work out which two by reading the table again.

   So this one states its refusals before it runs. Choosing an action does not
   perform it: it opens a confirm strip that names exactly who is excluded and
   why — the owner whose role only moves in a transfer, the row that is you —
   and gives the real count on the button. Nothing half-happens, and nothing
   is explained after the fact.

   The rest is ordinary table work done properly: search and filters narrow
   the same list the select-all applies to, so "select all" never quietly
   means "all two hundred" when you can see eleven; the header checkbox shows
   an indeterminate state; and rows are windowed so two hundred people scroll
   as cheaply as twelve.
   ========================================================================== */

/* ---------------------------------------------------------------- types -- */

export type MemberStatus = "active" | "pending" | "external" | "disabled";

export interface Member {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  role: Role;
  status?: MemberStatus;
  /** Free text: "Active 2 hours ago", "Joined Aug 2021". */
  lastActive?: string;
  /** The seat is on the paid plan. Drawn in gold. */
  premium?: boolean;
  /** Marks the signed-in person. They cannot bulk-act on themselves. */
  you?: boolean;
}

/** What a chosen bulk action would actually do, worked out before it runs. */
export interface BulkPlan {
  /** Rows the action applies to. */
  applies: Member[];
  /** Rows it refuses, each with the reason it refuses them. */
  refuses: { member: Member; reason: string }[];
  /** Seats returned to the plan if this runs. */
  seatsFreed: number;
}

export interface MembersTableProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onSelect"
> {
  members?: Member[];
  /** Rows rendered at once. Raise it only if you have measured. Default 12. */
  pageSize?: number;
  /** Runs after the confirm strip, with the rows that survived the refusals. */
  onBulkRole?: (ids: string[], role: AssignableRole) => void;
  onBulkRemove?: (ids: string[]) => void;
  onRowMenu?: (id: string, action: string) => void;
}

/* -------------------------------------------------------------- helpers -- */

const ROW_H = 56;

const STATUS_LABEL: Record<MemberStatus, string> = {
  active: "Active",
  pending: "Invited",
  external: "External",
  disabled: "Suspended",
};

function nameOf(m: Member) {
  if (m.name?.trim()) return m.name;
  const local = m.email.slice(0, m.email.indexOf("@"));
  if (!local) return m.email;
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Work out what a role change would really do.
 *
 * Every refusal here is a rule that exists somewhere in the product anyway —
 * the difference is that the reviewer reads it before pressing the button
 * rather than after. `already` is included on purpose: an action that reports
 * "12 updated" when four were already Viewer is lying about its own effect.
 */
function planRoleChange(selected: Member[], role: AssignableRole): BulkPlan {
  const applies: Member[] = [];
  const refuses: BulkPlan["refuses"] = [];

  for (const m of selected) {
    if (m.role === "owner") {
      refuses.push({
        member: m,
        reason: "the owner's role only moves in a transfer",
      });
    } else if (m.you) {
      refuses.push({ member: m, reason: "you cannot change your own role" });
    } else if (m.role === role) {
      refuses.push({ member: m, reason: `already ${ROLE_LABEL[role]}` });
    } else {
      applies.push(m);
    }
  }

  return { applies, refuses, seatsFreed: 0 };
}

function planRemove(selected: Member[]): BulkPlan {
  const applies: Member[] = [];
  const refuses: BulkPlan["refuses"] = [];

  for (const m of selected) {
    if (m.role === "owner") {
      refuses.push({ member: m, reason: "the owner cannot be removed" });
    } else if (m.you) {
      refuses.push({ member: m, reason: "you cannot remove yourself" });
    } else {
      applies.push(m);
    }
  }

  /* A suspended person already gave their seat back, so removing them frees
     nothing. Saying "12 seats freed" when it is 9 is the same class of lie as
     "12 updated". */
  const seatsFreed = applies.filter((m) => m.status !== "disabled").length;
  return { applies, refuses, seatsFreed };
}

/**
 * One sentence naming the refusals.
 *
 * Grouped by reason rather than listed per person, because "Sarah Anderson,
 * Michael Carter and 3 others were skipped" tells the reader who but not why,
 * and why is the part they can act on.
 */
function refusalSentence(refuses: BulkPlan["refuses"]) {
  if (refuses.length === 0) return null;

  const byReason = new Map<string, Member[]>();
  for (const r of refuses) {
    if (!byReason.has(r.reason)) byReason.set(r.reason, []);
    byReason.get(r.reason)!.push(r.member);
  }

  const parts = [...byReason.entries()].map(([reason, people]) => {
    const who =
      people.length === 1 ? nameOf(people[0]) : `${people.length} people`;
    return `${who} — ${reason}`;
  });

  return parts.join("; ");
}

/* ------------------------------------------------------------- checkbox -- */

function Checkbox({
  checked,
  indeterminate,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  const on = checked || indeterminate;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        "grid size-[16px] shrink-0 place-items-center rounded-[5px] transition-colors",
        on
          ? "bg-primary text-primary-foreground"
          : "ring-1 ring-inset ring-input hover:ring-input",
        disabled && "cursor-not-allowed opacity-35 hover:ring-input",
        SQUIRCLE,
        FOCUS,
      )}
      style={{ transitionDuration: `${DURATION.fast}s` }}
    >
      {indeterminate ? (
        <Minus aria-hidden="true" className="size-[11px]" strokeWidth={3} />
      ) : checked ? (
        <Check aria-hidden="true" className="size-[11px]" strokeWidth={3} />
      ) : null}
    </button>
  );
}

/* --------------------------------------------------------------- filter -- */

function FilterButton({
  label,
  active,
  items,
  onSelect,
}: {
  label: string;
  active: boolean;
  items: { id: string; label: string; checked: boolean }[];
  onSelect: (id: string) => void;
}) {
  return (
    <Menu
      align="start"
      width={196}
      items={items}
      onSelect={onSelect}
      trigger={({ ref, open, onClick, onKeyDown }) => (
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          onKeyDown={onKeyDown}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 font-medium transition-colors",
            active || open
              ? "bg-muted text-foreground"
              : "text-foreground/75 hover:bg-accent",
            EDGE,
            SQUIRCLE,
            FOCUS,
          )}
          style={{ fontSize: TYPE.dense }}
        >
          <SlidersHorizontal
            aria-hidden="true"
            className="size-[13px] opacity-60"
          />
          {label}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3 opacity-50 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      )}
    />
  );
}

/* ------------------------------------------------------------ component -- */

type Pending =
  | { kind: "role"; role: AssignableRole; plan: BulkPlan }
  | { kind: "remove"; plan: BulkPlan }
  | null;

export const MembersTable = React.forwardRef<HTMLDivElement, MembersTableProps>(
  function MembersTable(
    {
      members = [],
      pageSize = 12,
      onBulkRole,
      onBulkRemove,
      onRowMenu,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const reduce = useReducedMotion();

    const [query, setQuery] = React.useState("");
    const [roleFilter, setRoleFilter] = React.useState<Role | "all">("all");
    const [statusFilter, setStatusFilter] = React.useState<
      MemberStatus | "all"
    >("all");
    const [selected, setSelected] = React.useState<Set<string>>(new Set());
    const [pending, setPending] = React.useState<Pending>(null);
    const [scrollTop, setScrollTop] = React.useState(0);

    /* Filters and search narrow one list, and everything downstream — the
       select-all, the counts, the bulk plan — reads that same list. The bug
       this avoids is the classic one: "select all" quietly meaning all two
       hundred rows while the reader can see eleven. */
    const visible = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      return members.filter((m) => {
        if (roleFilter !== "all" && m.role !== roleFilter) return false;
        if (statusFilter !== "all" && (m.status ?? "active") !== statusFilter)
          return false;
        if (!q) return true;
        return (
          nameOf(m).toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
        );
      });
    }, [members, query, roleFilter, statusFilter]);

    /* A selection outlives the filter that made it, which surprises people:
       narrow to Guests, tick four, clear the filter, press Remove, and two
       admins go with them. So selection is intersected with what is on
       screen before anything acts on it. */
    const selectedVisible = React.useMemo(
      () => visible.filter((m) => selected.has(m.id)),
      [visible, selected],
    );

    const allVisibleSelected =
      visible.length > 0 && selectedVisible.length === visible.length;
    const someVisibleSelected =
      selectedVisible.length > 0 && !allVisibleSelected;

    function toggleAll() {
      setPending(null);
      setSelected((prev) => {
        const next = new Set(prev);
        if (allVisibleSelected) visible.forEach((m) => next.delete(m.id));
        else visible.forEach((m) => next.add(m.id));
        return next;
      });
    }

    function toggleOne(id: string) {
      setPending(null);
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }

    function clearSelection() {
      setSelected(new Set());
      setPending(null);
    }

    function runPending() {
      if (!pending) return;
      const ids = pending.plan.applies.map((m) => m.id);
      if (pending.kind === "role") onBulkRole?.(ids, pending.role);
      else onBulkRemove?.(ids);
      clearSelection();
    }

    /* Windowing. Rows are a fixed height on purpose — a table whose rows grow
       to fit their content cannot be windowed without measuring every row,
       and measuring every row is the thing windowing exists to avoid. */
    const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 2);
    const end = Math.min(visible.length, start + pageSize + 4);
    const slice = visible.slice(start, end);

    const bulkOpen = selectedVisible.length > 0;

    return (
      <div
        ref={ref}
        {...rest}
        style={{ fontFamily: FONT_STACK, ...style }}
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-[18px] bg-card",
          SQUIRCLE,
          EDGE,
          "shadow-[0_1px_2px_rgb(0_0_0/0.05)]",
          className,
        )}
      >
        {/* --------------------------------------------------- toolbar -- */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2.5">
          <label className="relative flex h-8 min-w-[160px] flex-1 items-center">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 size-[14px] text-muted-foreground/75"
            />
            <span className="sr-only">Search people</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              className={cn(
                "h-8 w-full rounded-[10px] bg-foreground/5 pr-2.5 pl-8 text-foreground",
                "placeholder:text-muted-foreground/75",
                SQUIRCLE,
                FOCUS,
              )}
              style={{ fontSize: TYPE.dense }}
            />
          </label>

          <FilterButton
            label={roleFilter === "all" ? "Role" : ROLE_LABEL[roleFilter]}
            active={roleFilter !== "all"}
            onSelect={(id) => setRoleFilter(id as Role | "all")}
            items={[
              { id: "all", label: "Any role", checked: roleFilter === "all" },
              ...(["owner", ...ASSIGNABLE_ROLES] as Role[]).map((r) => ({
                id: r,
                label: ROLE_LABEL[r],
                checked: roleFilter === r,
              })),
            ]}
          />

          <FilterButton
            label={
              statusFilter === "all" ? "Status" : STATUS_LABEL[statusFilter]
            }
            active={statusFilter !== "all"}
            onSelect={(id) => setStatusFilter(id as MemberStatus | "all")}
            items={[
              {
                id: "all",
                label: "Any status",
                checked: statusFilter === "all",
              },
              ...(Object.keys(STATUS_LABEL) as MemberStatus[]).map((s) => ({
                id: s,
                label: STATUS_LABEL[s],
                checked: statusFilter === s,
              })),
            ]}
          />
        </div>

        {/* ------------------------------------------------- bulk bar -- */}
        <AnimatePresence initial={false}>
          {bulkOpen && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={SOFT}
              className="overflow-hidden border-b border-border/60 bg-foreground/5"
            >
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <span
                  className="font-medium text-foreground tabular-nums"
                  style={{ fontSize: TYPE.dense }}
                >
                  {selectedVisible.length} selected
                </span>

                <Menu
                  align="start"
                  width={244}
                  items={ASSIGNABLE_ROLES.map((r) => ({
                    id: r,
                    label: `Change to ${ROLE_LABEL[r]}`,
                  }))}
                  onSelect={(id) =>
                    setPending({
                      kind: "role",
                      role: id as AssignableRole,
                      plan: planRoleChange(
                        selectedVisible,
                        id as AssignableRole,
                      ),
                    })
                  }
                  trigger={({ ref: r, open, onClick, onKeyDown }) => (
                    <button
                      ref={r}
                      type="button"
                      onClick={onClick}
                      onKeyDown={onKeyDown}
                      aria-haspopup="menu"
                      aria-expanded={open}
                      className={cn(
                        "inline-flex h-7 items-center gap-1 rounded-[9px] bg-card px-2.5 font-medium text-foreground/90",
                        "transition-colors hover:bg-accent",
                        EDGE,
                        SQUIRCLE,
                        FOCUS,
                      )}
                      style={{ fontSize: TYPE.chip }}
                    >
                      Change role
                      <ChevronDown
                        aria-hidden="true"
                        className={cn(
                          "size-3 opacity-50 transition-transform",
                          open && "rotate-180",
                        )}
                      />
                    </button>
                  )}
                />

                <button
                  type="button"
                  onClick={() =>
                    setPending({
                      kind: "remove",
                      plan: planRemove(selectedVisible),
                    })
                  }
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-[9px] px-2.5 font-medium transition-colors",
                    DANGER.text,
                    "hover:bg-destructive/10",
                    SQUIRCLE,
                    FOCUS,
                  )}
                  style={{ fontSize: TYPE.chip }}
                >
                  <Trash2 aria-hidden="true" className="size-[13px]" />
                  Remove
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  className={cn(
                    "ml-auto inline-flex h-7 items-center gap-1 rounded-[9px] px-2 text-muted-foreground transition-colors",
                    "hover:text-foreground",
                    SQUIRCLE,
                    FOCUS,
                  )}
                  style={{ fontSize: TYPE.chip }}
                >
                  <X aria-hidden="true" className="size-[13px]" />
                  Clear
                </button>
              </div>

              {/* The confirm strip. This is the component's argument: the
                  action has not run, and everything it will refuse is named
                  here, with the true count on the button. */}
              <AnimatePresence initial={false}>
                {pending && (
                  <motion.div
                    initial={
                      reduce ? { opacity: 0 } : { opacity: 0, height: 0 }
                    }
                    animate={
                      reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }
                    }
                    exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    transition={SOFT}
                    className="overflow-hidden border-t border-border/60"
                  >
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5">
                      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
                        <span
                          className="font-medium text-foreground"
                          style={{ fontSize: TYPE.dense }}
                        >
                          {pending.kind === "role"
                            ? `Change ${pending.plan.applies.length} to ${ROLE_LABEL[pending.role]}`
                            : `Remove ${pending.plan.applies.length} from the workspace`}
                          {pending.kind === "remove" &&
                            pending.plan.seatsFreed > 0 && (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                · frees {pending.plan.seatsFreed}{" "}
                                {pending.plan.seatsFreed === 1
                                  ? "seat"
                                  : "seats"}
                              </span>
                            )}
                        </span>

                        {pending.plan.refuses.length > 0 && (
                          <span
                            className="text-muted-foreground"
                            style={{ fontSize: TYPE.meta }}
                          >
                            Skips {pending.plan.refuses.length}:{" "}
                            {refusalSentence(pending.plan.refuses)}
                          </span>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPending(null)}
                          className={cn(
                            "h-7 rounded-[9px] px-2.5 font-medium text-muted-foreground transition-colors",
                            "hover:text-foreground",
                            SQUIRCLE,
                            FOCUS,
                          )}
                          style={{ fontSize: TYPE.chip }}
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          disabled={pending.plan.applies.length === 0}
                          onClick={runPending}
                          className={cn(
                            "h-7 rounded-[9px] px-3 font-medium transition-colors",
                            pending.plan.applies.length === 0
                              ? "cursor-not-allowed bg-muted text-muted-foreground/75"
                              : pending.kind === "remove"
                                ? DANGER.solid
                                : "bg-primary text-primary-foreground hover:bg-primary/90",
                            SQUIRCLE,
                            FOCUS,
                          )}
                          style={{ fontSize: TYPE.chip }}
                        >
                          {pending.plan.applies.length === 0
                            ? "Nothing to do"
                            : `${pending.kind === "remove" ? "Remove" : "Apply to"} ${pending.plan.applies.length}`}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------------------------------------------- header -- */}
        <div
          className={cn(
            "flex items-center gap-3 border-b border-border/60 px-3 py-2",
            "font-medium tracking-[0.06em] text-muted-foreground/75 uppercase",
          )}
          style={{ fontSize: TYPE.micro }}
        >
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected}
            disabled={visible.length === 0}
            label={allVisibleSelected ? "Clear selection" : "Select all shown"}
            onChange={toggleAll}
          />
          <span className="min-w-0 flex-[2.6]">Person</span>
          <span className="hidden w-[92px] shrink-0 sm:block">Role</span>
          <span className="hidden w-[84px] shrink-0 sm:block">Status</span>
          <span className="hidden w-[132px] shrink-0 md:block">
            Last active
          </span>
          <span className="w-[28px] shrink-0" aria-hidden="true" />
        </div>

        {/* ------------------------------------------------------ rows -- */}
        {visible.length === 0 ? (
          <div
            className="px-3 py-10 text-center text-muted-foreground/75"
            style={{ fontSize: TYPE.sub }}
          >
            Nobody matches that. Clear the search or the filters to see
            everyone.
          </div>
        ) : (
          <div
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            className="overflow-y-auto"
            style={{ maxHeight: pageSize * ROW_H }}
          >
            <div
              style={{ height: visible.length * ROW_H, position: "relative" }}
            >
              <div style={{ transform: `translateY(${start * ROW_H}px)` }}>
                {slice.map((m) => {
                  const status = m.status ?? "active";
                  const label = nameOf(m);
                  /* The owner and you are tickable like anyone else. The
                     alternative — disabling those checkboxes — puts the
                     rules in two places, and the one in the table cannot say
                     why. Selection stays dumb; the confirm strip is the only
                     thing that knows what is allowed, and it explains itself. */
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-center gap-3 border-b border-border/40 px-3 last:border-0",
                        "transition-colors hover:bg-accent",
                        selected.has(m.id) && "bg-foreground/5",
                      )}
                      style={{ height: ROW_H }}
                    >
                      <Checkbox
                        checked={selected.has(m.id)}
                        label={`Select ${label}`}
                        onChange={() => toggleOne(m.id)}
                      />

                      <div className="flex min-w-0 flex-[2.6] items-center gap-2.5">
                        <Avatar
                          seed={m.email}
                          src={m.avatar}
                          name={label}
                          size={28}
                          className={
                            status === "pending" || status === "disabled"
                              ? "opacity-60"
                              : undefined
                          }
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="truncate font-medium text-foreground"
                              style={{ fontSize: TYPE.sub }}
                            >
                              {label}
                            </span>
                            {m.you && (
                              <span
                                className="shrink-0 text-muted-foreground/75"
                                style={{ fontSize: TYPE.micro }}
                              >
                                you
                              </span>
                            )}
                            {m.role === "owner" && (
                              <Crown
                                aria-label="Owner"
                                className="size-[12px] shrink-0 text-muted-foreground/75"
                              />
                            )}
                            {m.premium && (
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-[5px] py-[1px] font-medium",
                                  PREMIUM.bg,
                                  PREMIUM.text,
                                )}
                                style={{ fontSize: TYPE.micro }}
                              >
                                Premium
                              </span>
                            )}
                          </span>
                          <span
                            className="truncate text-muted-foreground"
                            style={{ fontSize: TYPE.micro }}
                          >
                            {m.email}
                          </span>
                        </div>
                      </div>

                      <span className="hidden w-[92px] shrink-0 sm:block">
                        <RoleChip
                          role={m.role}
                          size="sm"
                          showOwnerMark={false}
                        />
                      </span>

                      <span
                        className={cn(
                          "hidden w-[84px] shrink-0 sm:block",
                          status === "disabled"
                            ? DANGER.text
                            : "text-muted-foreground",
                        )}
                        style={{ fontSize: TYPE.micro }}
                      >
                        {STATUS_LABEL[status]}
                      </span>

                      <span
                        className="hidden w-[132px] shrink-0 truncate text-muted-foreground md:block"
                        style={{ fontSize: TYPE.micro }}
                      >
                        {m.lastActive ?? "—"}
                      </span>

                      <span className="w-[28px] shrink-0">
                        {!m.you && m.role !== "owner" && (
                          <Menu
                            width={216}
                            triggerLabel={`Options for ${label}`}
                            onSelect={(id) => onRowMenu?.(m.id, id)}
                            items={[
                              { id: "profile", label: "View profile" },
                              { id: "copy-email", label: "Copy email address" },
                              { id: "change-role", label: "Change role…" },
                              {
                                id: "remove",
                                label: "Remove from workspace",
                                danger: true,
                              },
                            ]}
                          />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default MembersTable;
