"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Button } from "./button";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.8,
} as const;

const SQUIRCLE = "[corner-shape:squircle]";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ==========================================================================
   Streaming Response

   An answer that arrives a few characters at a time and still looks finished
   at every moment in between.

     <StreamingResponse text={answerSoFar} streaming={!done} />

   Pass the growing string on every chunk. Three things happen that a plain
   <Markdown> gets wrong while text is still arriving:

     half-written Markdown   An unclosed **bold, a code fence with no end, a
                             table whose last row is half typed — each renders
                             as the thing it is about to become, not as raw
                             asterisks and pipes that then jump.

     bursty chunks           Models send nothing for 300ms and then a sentence.
                             smooth meters that out, so the text runs at a
                             steady pace and catches up when it falls behind.

     where it is             A caret sits at the end while more is coming, and
                             each new word fades in rather than popping.

   The Markdown it reads is the subset answers are actually written in:
   headings, paragraphs, bold, italic, inline code, links, lists, quotes,
   rules, fenced code and tables. There is no dependency behind it. Links are
   limited to http, https, mailto and relative paths.

   simulateStream is exported for demos and tests: it turns a string into
   the same kind of async stream a model returns.
   ========================================================================== */

/* ---------------------------------------------------------------- parsing -- */

type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "a"; href: string; c: Inline[] };

type Block =
  | { t: "p"; text: string }
  | { t: "h"; level: number; text: string }
  | { t: "code"; lang: string; code: string; open: boolean }
  | {
      t: "list";
      ordered: boolean;
      start: number;
      items: string[];
    }
  | {
      t: "table";
      head: string[];
      align: ("left" | "right" | "center")[];
      rows: string[][];
    }
  | { t: "quote"; text: string }
  | { t: "hr" };

const SAFE_HREF = /^(https?:\/\/|mailto:|\/|#)/i;
const LIST_ITEM = /^\s{0,3}([-*+]|\d{1,3}[.)])\s+(.*)$/;
const TABLE_RULE =
  /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = line.match(/^\s*```+\s*([\w+-]*)\s*$/);

    if (fence) {
      const body: string[] = [];
      let open = true;

      i++;

      while (i < lines.length) {
        if (/^\s*```+\s*$/.test(lines[i])) {
          open = false;
          i++;
          break;
        }

        body.push(lines[i]);
        i++;
      }

      out.push({
        t: "code",
        lang: fence[1] ?? "",
        code: body.join("\n"),
        open,
      });

      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);

    if (heading) {
      out.push({
        t: "h",
        level: heading[1].length,
        text: heading[2].replace(/\s+#+\s*$/, ""),
      });

      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push({ t: "hr" });
      i++;
      continue;
    }

    /*
     * A row of pipes is a table as soon as it starts. Waiting for the rule
     * line underneath would show the header as text for a beat and then
     * redraw it as a table.
     */
    if (/^\s*\|/.test(line)) {
      const head = cells(line);
      let align: ("left" | "right" | "center")[] = head.map(
        () => "left",
      );

      i++;

      if (
        i < lines.length &&
        TABLE_RULE.test(lines[i]) &&
        lines[i].includes("-")
      ) {
        align = cells(lines[i]).map((c) =>
          c.startsWith(":") && c.endsWith(":")
            ? "center"
            : c.endsWith(":")
              ? "right"
              : "left",
        );

        i++;
      }

      const rows: string[][] = [];

      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(cells(lines[i]));
        i++;
      }

      out.push({
        t: "table",
        head,
        align,
        rows,
      });

      continue;
    }

    if (/^\s{0,3}>/.test(line)) {
      const body: string[] = [];

      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
        body.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
        i++;
      }

      out.push({
        t: "quote",
        text: body.join(" "),
      });

      continue;
    }

    const item = line.match(LIST_ITEM);

    if (item) {
      const ordered = /\d/.test(item[1]);
      const items: string[] = [];
      const start = ordered ? parseInt(item[1], 10) : 1;

      while (i < lines.length) {
        const m = lines[i].match(LIST_ITEM);

        if (m && /\d/.test(m[1]) === ordered) {
          items.push(m[2]);
          i++;
        } else if (
          lines[i].trim() &&
          /^\s{2,}/.test(lines[i]) &&
          items.length
        ) {
          items[items.length - 1] += " " + lines[i].trim();
          i++;
        } else {
          break;
        }
      }

      out.push({
        t: "list",
        ordered,
        start,
        items,
      });

      continue;
    }

    const para: string[] = [];

    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*```/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^\s*\|/.test(lines[i]) &&
      !/^\s{0,3}>/.test(lines[i]) &&
      !LIST_ITEM.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }

    out.push({
      t: "p",
      text: para.join(" "),
    });
  }

  return out;
}

/**
 * Inline Markdown, forgiving of the half-typed. An opener with no closer is
 * treated as open to the end of the text, which is what it will be once the
 * closer arrives — so **Total is bold from the first asterisk, not after the
 * fourth.
 */
function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let buf = "";
  let i = 0;

  const flush = () => {
    if (buf) {
      out.push({
        t: "text",
        v: buf,
      });
    }

    buf = "";
  };

  while (i < src.length) {
    const ch = src[i];

    if (ch === "\\" && i + 1 < src.length) {
      buf += src[i + 1];
      i += 2;
      continue;
    }

    if (ch === "`") {
      const end = src.indexOf("`", i + 1);

      flush();

      out.push({
        t: "code",
        v: src.slice(
          i + 1,
          end === -1 ? undefined : end,
        ),
      });

      i = end === -1 ? src.length : end + 1;
      continue;
    }

    if (src.startsWith("**", i) || src.startsWith("__", i)) {
      const mark = src.slice(i, i + 2);
      const end = src.indexOf(mark, i + 2);

      flush();

      out.push({
        t: "strong",
        c: parseInline(
          src.slice(
            i + 2,
            end === -1 ? undefined : end,
          ),
        ),
      });

      i = end === -1 ? src.length : end + 2;
      continue;
    }

    if (
      (ch === "*" || ch === "_") &&
      /\S/.test(src[i + 1] ?? "") &&
      (i === 0 || /[\s([{'"]/.test(src[i - 1]))
    ) {
      let end = -1;

      for (let k = i + 1; k < src.length; k++) {
        if (
          src[k] === ch &&
          /\S/.test(src[k - 1]) &&
          !/\w/.test(src[k + 1] ?? "")
        ) {
          end = k;
          break;
        }
      }

      if (end !== -1) {
        flush();

        out.push({
          t: "em",
          c: parseInline(src.slice(i + 1, end)),
        });

        i = end + 1;
        continue;
      }
    }

    if (ch === "[") {
      const close = src.indexOf("]", i + 1);

      if (close !== -1 && src[close + 1] === "(") {
        const end = src.indexOf(")", close + 2);
        const label = src.slice(i + 1, close);

        flush();

        if (end === -1) {
          /*
           * The address is still arriving: show the words, link them later.
           */
          out.push(...parseInline(label));
          i = src.length;
        } else {
          const href = src.slice(close + 2, end).trim();

          if (SAFE_HREF.test(href)) {
            out.push({
              t: "a",
              href,
              c: parseInline(label),
            });
          } else {
            out.push(...parseInline(label));
          }

          i = end + 1;
        }

        continue;
      }
    }

    buf += ch;
    i++;
  }

  flush();

  return out;
}

/* -------------------------------------------------------------- rendering -- */

function Words({
  text,
  animate,
}: {
  text: string;
  animate: boolean;
}) {
  if (!animate) return <>{text}</>;

  return (
    <>
      {text.split(/(\s+)/).map((w, i) =>
        w.trim() ? (
          <span
            key={i}
            className="motion-safe:animate-word-in"
          >
            {w}
          </span>
        ) : (
          w
        ),
      )}
    </>
  );
}

function InlineNodes({
  nodes,
  animate,
}: {
  nodes: Inline[];
  animate: boolean;
}) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case "text":
            return (
              <Words
                key={i}
                text={n.v}
                animate={animate}
              />
            );

          case "strong":
            return (
              <strong
                key={i}
                className="font-semibold"
              >
                <InlineNodes
                  nodes={n.c}
                  animate={animate}
                />
              </strong>
            );

          case "em":
            return (
              <em key={i}>
                <InlineNodes
                  nodes={n.c}
                  animate={animate}
                />
              </em>
            );

          case "code":
            return (
              <code
                key={i}
                className="rounded-[6px] bg-muted px-1 py-px font-mono text-[0.92em]"
              >
                {n.v}
              </code>
            );

          case "a":
            return (
              <a
                key={i}
                href={n.href}
                target={
                  n.href.startsWith("http")
                    ? "_blank"
                    : undefined
                }
                rel={
                  n.href.startsWith("http")
                    ? "noreferrer noopener"
                    : undefined
                }
                className={cn(
                  "font-medium underline decoration-foreground/30 underline-offset-[3px] transition-colors hover:decoration-foreground rounded-[4px]",
                  FOCUS,
                )}
              >
                <InlineNodes
                  nodes={n.c}
                  animate={animate}
                />
              </a>
            );
        }
      })}
    </>
  );
}

const Text = ({
  src,
  animate,
}: {
  src: string;
  animate: boolean;
}) => (
  <InlineNodes
    nodes={parseInline(src)}
    animate={animate}
  />
);

function Caret() {
  return (
    <span
      aria-hidden
      data-caret
      className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] rounded-full bg-foreground motion-safe:animate-caret"
    />
  );
}

function CodeBlock({
  lang,
  code,
  caret,
  onCopy,
}: {
  lang: string;
  code: string;
  caret: boolean;
  onCopy?: (
    code: string,
    language?: string,
  ) => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  React.useEffect(
    () => () =>
      void (
        timer.current &&
        clearTimeout(timer.current)
      ),
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      /*
       * Clipboard blocked (an insecure origin, a sandbox): the button still
       * confirms, and onCopyCode lets the host do it another way.
       */
    }

    onCopy?.(code, lang || undefined);
    setCopied(true);

    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(
      () => setCopied(false),
      1600,
    );
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[12px] bg-muted/60 ring-1 ring-inset ring-border",
        SQUIRCLE,
      )}
    >
      <div className="flex h-8 items-center justify-between border-b border-border pr-1 pl-3">
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
          {lang || "code"}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          className="h-6 gap-1.5 rounded-[7px] px-1.5 text-[11.5px] text-muted-foreground hover:bg-foreground/[0.07] hover:text-foreground"
        >
          <span className="relative grid size-3.5 place-items-center">
            <AnimatePresence
              initial={false}
              mode="popLayout"
            >
              <motion.span
                key={copied ? "done" : "copy"}
                initial={{
                  opacity: 0,
                  scale: 0.5,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.5,
                }}
                transition={SPRING}
                className="absolute inset-0 grid place-items-center"
              >
                {copied ? (
                  <Check className="size-3.5 text-success" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </motion.span>
            </AnimatePresence>
          </span>

          <span aria-live="polite">
            {copied ? "Copied" : "Copy"}
          </span>
        </Button>
      </div>

      <pre
        tabIndex={0}
        aria-label={lang ? `${lang} code` : "Code"}
        className={cn(
          "overflow-x-auto px-3 py-2.5 font-mono text-[12px] leading-[1.65] outline-none",
          FOCUS,
        )}
      >
        <code>
          {code}
          {caret && <Caret />}
        </code>
      </pre>
    </div>
  );
}

const ALIGN = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

function BlockView({
  block,
  animate,
  caret,
  onCopyCode,
}: {
  block: Block;
  animate: boolean;
  caret: boolean;
  onCopyCode?: (
    code: string,
    language?: string,
  ) => void;
}) {
  switch (block.t) {
    case "p":
      return (
        <p>
          <Text
            src={block.text}
            animate={animate}
          />
          {caret && <Caret />}
        </p>
      );

    case "h": {
      const Tag = (
        block.level <= 2 ? "h3" : "h4"
      ) as "h3" | "h4";

      return (
        <Tag
          className={cn(
            "font-semibold tracking-tight",
            block.level <= 2
              ? "mt-1 text-[15px]"
              : "text-[13.5px]",
          )}
        >
          <Text
            src={block.text}
            animate={animate}
          />
          {caret && <Caret />}
        </Tag>
      );
    }

    case "code":
      return (
        <CodeBlock
          lang={block.lang}
          code={block.code}
          caret={caret}
          onCopy={onCopyCode}
        />
      );

    case "list": {
      const Tag = block.ordered ? "ol" : "ul";

      return (
        <Tag
          start={
            block.ordered
              ? block.start
              : undefined
          }
          className="flex flex-col gap-1 pl-1"
        >
          {block.items.map((it, i) => (
            <li
              key={i}
              className="flex gap-2.5"
            >
              <span
                aria-hidden
                className="w-4 shrink-0 text-right text-muted-foreground tabular-nums select-none"
              >
                {block.ordered
                  ? `${block.start + i}.`
                  : "•"}
              </span>

              <span className="min-w-0 flex-1">
                <Text
                  src={it}
                  animate={animate}
                />

                {caret &&
                  i ===
                    block.items.length - 1 && (
                    <Caret />
                  )}
              </span>
            </li>
          ))}
        </Tag>
      );
    }

    case "table":
      return (
        <div
          tabIndex={0}
          role="region"
          aria-label="Table"
          className={cn(
            "overflow-x-auto rounded-[12px] ring-1 ring-inset ring-border outline-none",
            FOCUS,
            SQUIRCLE,
          )}
        >
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-muted/60">
                {block.head.map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={cn(
                      "px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-muted-foreground",
                      ALIGN[
                        block.align[i] ?? "left"
                      ],
                    )}
                  >
                    <Text
                      src={h}
                      animate={false}
                    />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {block.rows.map((r, ri) => (
                <tr
                  key={ri}
                  className={cn(
                    "border-t border-border",
                    animate &&
                      "motion-safe:animate-fade-in",
                  )}
                >
                  {block.head.map(
                    (_, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          "px-3 py-2 align-top tabular-nums",
                          ALIGN[
                            block.align[
                              ci
                            ] ?? "left"
                          ],
                        )}
                      >
                        <Text
                          src={r[ci] ?? ""}
                          animate={false}
                        />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "quote":
      return (
        <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">
          <Text
            src={block.text}
            animate={animate}
          />
          {caret && <Caret />}
        </blockquote>
      );

    case "hr":
      return <hr className="border-border" />;
  }
}

/* --------------------------------------------------------------- smoothing -- */

/**
 * Reveals `text` at a steady pace however unevenly it arrives. The further
 * behind it is, the faster it goes, so it never lags a long answer by more
 * than a moment and never sprints through a short one.
 */
function useSmoothText(
  text: string,
  streaming: boolean,
  enabled: boolean,
) {
  const [shown, setShown] = React.useState(
    enabled && streaming ? 0 : text.length,
  );

  const pos = React.useRef(shown);
  const target = React.useRef(text.length);
  const live = React.useRef(streaming);

  target.current = text.length;
  live.current = streaming;

  React.useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    let last = performance.now();
    let carry = 0;

    const tick = (now: number) => {
      const dt = Math.min(
        0.05,
        (now - last) / 1000,
      );

      last = now;

      const goal = target.current;

      if (pos.current < goal) {
        const behind = goal - pos.current;

        /*
         * Characters per second: brisk reading speed, rising with the backlog,
         * and a sprint to the end once nothing more is coming.
         */
        const rate = live.current
          ? Math.max(70, behind * 5)
          : Math.max(260, behind * 12);

        carry += rate * dt;

        const step = Math.floor(carry);
        carry -= step;

        if (step > 0) {
          pos.current = Math.min(
            goal,
            pos.current + step,
          );

          setShown(pos.current);
        }
      } else if (!live.current) {
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () =>
      cancelAnimationFrame(raf);

    /*
     * Restart when streaming resumes after having settled.
     */
  }, [enabled, streaming]);

  if (!enabled) return text;

  return shown >= text.length
    ? text
    : text.slice(0, shown);
}

/* --------------------------------------------------------------- component -- */

export interface StreamingResponseProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "children"
  > {
  /** The answer so far, as Markdown. Pass the whole growing string on every chunk. */
  text: string;
  /** True while more is coming. Shows the caret and fades new words in. */
  streaming?: boolean;
  /** Even out bursty chunks so the text arrives at a steady pace. Default true. */
  smooth?: boolean;
  /** Fade each word in as it arrives. Default true. */
  animateWords?: boolean;
  /** Called once the last character is on screen: `streaming` is false and the pacing has caught up. */
  onSettled?: () => void;
  /** Called with the code when a block's Copy is pressed. */
  onCopyCode?: (
    code: string,
    language?: string,
  ) => void;
}

export const StreamingResponse =
  React.forwardRef<
    HTMLDivElement,
    StreamingResponseProps
  >(function StreamingResponse(
    {
      text,
      streaming = false,
      smooth = true,
      animateWords = true,
      onSettled,
      onCopyCode,
      className,
      ...props
    },
    ref,
  ) {
    const reduce = useReducedMotion();

    /*
     * Decided once: an answer that was already complete when it mounted is
     * shown whole, and one that streams keeps its pacing until it settles.
     */
    const [paced] = React.useState(
      () => smooth && streaming && !reduce,
    );

    const visible = useSmoothText(
      text,
      streaming,
      paced,
    );

    const arriving =
      streaming || visible.length < text.length;

    const blocks = React.useMemo(
      () => parseBlocks(visible),
      [visible],
    );

    const settled = React.useRef(!arriving);

    React.useEffect(() => {
      if (!arriving && !settled.current) {
        onSettled?.();
      }

      settled.current = !arriving;
    }, [arriving, onSettled]);

    const fade =
      animateWords && arriving && !reduce;

    return (
      <div
        ref={ref}
        data-streaming={
          arriving || undefined
        }
        aria-busy={
          arriving || undefined
        }
        className={cn(
          "flex min-w-0 flex-col gap-2.5 text-[13.5px] leading-[1.6] text-foreground",
          className,
        )}
        {...props}
      >
        {blocks.map((b, i) => (
          <BlockView
            key={i}
            block={b}
            animate={fade}
            caret={
              arriving &&
              i === blocks.length - 1 &&
              b.t !== "table" &&
              b.t !== "hr"
            }
            onCopyCode={onCopyCode}
          />
        ))}

        {arriving &&
          blocks.length === 0 && (
            <p>
              <Caret />
            </p>
          )}
      </div>
    );
  });

/* --------------------------------------------------------------- simulator -- */

export interface SimulateStreamOptions {
  /** Abort to stop mid-answer, the way a Stop button does. */
  signal?: AbortSignal;
  /** Milliseconds before the first chunk. Default 0. */
  startDelay?: number;
  /** Throw after this many characters, to exercise the failure path. */
  failAfter?: number;
  /** The error message used with `failAfter`. */
  failWith?: string;
}

/**
 * A stand-in for a model: yields `text` in uneven chunks with uneven pauses.
 * Use it to build and test a chat screen before there is a backend.
 */
export async function* simulateStream(
  text: string,
  options: SimulateStreamOptions = {},
): AsyncGenerator<string> {
  const {
    signal,
    startDelay = 0,
    failAfter,
    failWith =
      "The connection dropped before the answer finished.",
  } = options;

  const wait = (ms: number) =>
    new Promise<void>(
      (resolve, reject) => {
        if (signal?.aborted) {
          return reject(
            new DOMException(
              "Aborted",
              "AbortError",
            ),
          );
        }

        const t = setTimeout(
          resolve,
          ms,
        );

        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(t);
            reject(
              new DOMException(
                "Aborted",
                "AbortError",
              ),
            );
          },
          { once: true },
        );
      },
    );

  if (startDelay) {
    await wait(startDelay);
  }

  let sent = 0;

  /*
   * A fixed sequence, not Math.random: the same answer streams the same way
   * every time, which keeps demos and screenshots repeatable.
   */
  let seed = 7;

  const next = () =>
    (seed = (seed * 16807) % 2147483647) /
    2147483647;

  while (sent < text.length) {
    const size =
      2 + Math.floor(next() * 9);

    const chunk = text.slice(
      sent,
      sent + size,
    );

    sent += chunk.length;

    if (
      failAfter !== undefined &&
      sent >= failAfter
    ) {
      throw new Error(failWith);
    }

    yield chunk;

    await wait(
      next() < 0.12
        ? 140 + next() * 160
        : 14 + next() * 34,
    );
  }
}

export default StreamingResponse;
