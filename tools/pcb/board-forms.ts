/**
 * EDITING A `.kicad_pcb` AS TEXT, at the granularity of a top-level form.
 *
 * WHY TEXT AND NOT A WRITER. `lib/kicad/sexpr.ts` parses and does not
 * serialise, so there is no round trip through the model: anything that went in
 * through the parser and out through a printer would be reformatted wholesale,
 * and a diff of a 178,000-byte board in which every line moved is a diff nobody
 * reads. `tools/pcb/update-from-schematic.ts` drives `pcbnew` instead, which is
 * the right tool for populating a board from a netlist and the wrong one for
 * adding four graphic forms: it rewrites the whole file and needs KiCad's
 * bundled interpreter.
 *
 * So the operations here ADD and REMOVE whole top-level forms and touch nothing
 * else. A board edited this way differs from its predecessor in exactly the
 * lines that were added or taken away, which is what makes the change reviewable.
 *
 * WHAT MAKES IT SAFE RATHER THAN A REGEX. `spanOfTopLevelForms` scans with a
 * paren depth counter that understands KiCad's quoted strings and their
 * backslash escapes, so a `)` inside `(descr "... (see note) ...")` does not
 * close a form and a `"` inside `(property "Value" "3\"")` does not open one.
 * Every span it returns is checked to begin with `(` and end with the matching
 * `)`; a file it cannot scan to a zero depth is refused rather than edited.
 */
import { parseSexpr } from "../../lib/kicad/sexpr.ts"

/** One top-level child of the root form: its name and its byte span in the text. */
export interface FormSpan {
  readonly name: string
  /** Index of the opening `(`. */
  readonly start: number
  /** Index one past the closing `)`. */
  readonly end: number
}

const NAME = /^\(\s*([A-Za-z_][A-Za-z0-9_]*)/

/**
 * Every top-level form inside the root, in file order.
 *
 * The root itself (`(kicad_pcb ...)`) is not among them: these are its
 * children, which is the granularity every operation in this module works at.
 */
export function topLevelForms(text: string, where: string): readonly FormSpan[] {
  const rootStart = text.indexOf("(")
  if (rootStart < 0) throw new Error(`${where}: no s-expression at all - the file opens with no "("`)
  const spans: FormSpan[] = []
  let depth = 0
  let inString = false
  let formStart = -1
  for (let i = rootStart; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (ch === "\\") i += 1
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === "(") {
      depth += 1
      if (depth === 2) formStart = i
      continue
    }
    if (ch === ")") {
      depth -= 1
      if (depth === 1 && formStart >= 0) {
        const body = text.slice(formStart, i + 1)
        const matched = NAME.exec(body)
        if (matched === null) {
          throw new Error(
            `${where}: a top-level form at byte ${formStart} opens with no readable name ` +
              `(${JSON.stringify(body.slice(0, 40))}). It is refused rather than skipped: a form ` +
              "this scanner cannot name is one it cannot be trusted to have delimited either.",
          )
        }
        spans.push({ name: matched[1] as string, start: formStart, end: i + 1 })
        formStart = -1
        continue
      }
      if (depth === 0) {
        if (i !== text.trimEnd().length - 1) {
          throw new Error(
            `${where}: the root form closes at byte ${i} with ${text.length - i - 1} bytes after ` +
              "it. This file holds more than one top-level s-expression, which no .kicad_pcb does.",
          )
        }
        return spans
      }
      if (depth < 0) throw new Error(`${where}: a ")" at byte ${i} closes a form that was never opened.`)
    }
  }
  throw new Error(
    `${where}: the file ends at paren depth ${depth} - it is truncated or unbalanced. Refused ` +
      "rather than edited: an edit computed from a mis-scanned file lands in the wrong place.",
  )
}

/**
 * `text` with every top-level form `drop` selects removed, and the count removed.
 *
 * Removal takes the form's own line indentation and its trailing newline with
 * it, so what is left is not a blank line where a form used to be.
 */
export function withoutTopLevelForms(
  text: string,
  where: string,
  drop: (form: FormSpan, body: string) => boolean,
): { readonly text: string; readonly removed: number } {
  const doomed = topLevelForms(text, where).filter((form) => drop(form, text.slice(form.start, form.end)))
  let out = text
  let removed = 0
  // Back to front, so an earlier removal cannot shift a later span's indices.
  for (const form of [...doomed].reverse()) {
    let from = form.start
    while (from > 0 && (text[from - 1] === "\t" || text[from - 1] === " ")) from -= 1
    let to = form.end
    if (out[to] === "\n") to += 1
    out = out.slice(0, from) + out.slice(to)
    removed += 1
  }
  return { text: out, removed }
}

/**
 * `text` with `forms` inserted as the root's last children.
 *
 * Each entry is a complete form; this function supplies the one tab of
 * indentation KiCad writes at this level and the newline after it. The
 * insertion point is immediately before the root's closing paren, which is
 * where KiCad itself leaves `(embedded_fonts ...)` - so a form added here is
 * the last thing in the file rather than the last thing before whatever
 * happened to be at the end.
 */
export function withTopLevelForms(text: string, where: string, forms: readonly string[]): string {
  if (forms.length === 0) {
    throw new Error(
      `${where}: withTopLevelForms was given nothing to insert. An empty insertion is refused ` +
        "rather than returning the text unchanged, because a caller that computed zero forms has " +
        "a bug its caller needs to see rather than a no-op to ignore.",
    )
  }
  const trimmed = text.trimEnd()
  if (!trimmed.endsWith(")")) {
    throw new Error(`${where}: the file does not end with the root form's closing ")".`)
  }
  // Proves the scan above agrees with the parser about where the root closes.
  topLevelForms(text, where)
  const body = forms.map((form) => `\t${form.trim()}\n`).join("")
  return `${trimmed.slice(0, -1)}${body})\n`
}

/** Parses `text`, so a board this module has edited is proven still readable. */
export function assertStillParses(text: string, where: string): void {
  const root = parseSexpr(text)
  if (root.name !== "kicad_pcb") {
    throw new Error(`${where}: the root form is "${root.name}", not "kicad_pcb".`)
  }
  if (root.nodes.length === 0) throw new Error(`${where}: the root form has no children at all.`)
}
