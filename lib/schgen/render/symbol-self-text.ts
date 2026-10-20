/**
 * Ported from digital-pedal-platform's `tools/schgen/render/symbolSelfText.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * A symbol's own pin text against itself: every visible pin name and pin number of one unit, as
 * KiCad draws them in the library frame, must not overlap another. A1's sheet text check sees a
 * placed unit's pin text only as obstacles for other items, never against the same unit, so a
 * custom symbol whose bottom pin name runs into a side pin name would pass it.
 *
 * Text extents are the generator's conservative ones (textWidth: one grid step per character,
 * one text height plus a margin across), so a symbol that passes here reads cleanly in KiCad.
 */
import { GRID, type Um } from "./geometry.ts";
import type { LibSymbol, SymbolResolver } from "./library.ts";
import type { Box, LibPin } from "./lib-pins.ts";
import { textWidth as rawWidth } from "./text-boxes.ts";

/** KiCad text markup: ~{overbar}, _{subscript}, ^{superscript}. */
const MARKUP = /[~_^]\{([^}]*)\}/g;

/** Width of the characters KiCad draws: markup braces and markers are not drawn. */
const textWidth = (text: string): Um => rawWidth(text.replace(MARKUP, "$1"));

interface TextBox {
  /** The pin the text belongs to. */
  readonly pin: LibPin;
  readonly what: string;
  readonly box: Box;
}

/** Text height (1.27 mm) plus KiCad's gap between a pin line and the text beside it. */
const ACROSS: Um = GRID + 254;

/** Unit vector from the pin's connection point toward the body (library frame, Y up). */
function direction(p: LibPin): readonly [number, number] {
  if (p.angle === 0) return [1, 0];
  if (p.angle === 90) return [0, 1];
  if (p.angle === 180) return [-1, 0];
  return [0, -1];
}

const visibleText = (s: string): boolean => s !== "" && s !== "~";

/** A run of text along the pin's axis from `start`, `len` long, spanning [lo, hi] across it. */
function run(p: LibPin, start: Um, len: Um, lo: Um, hi: Um): Box {
  const [dx, dy] = direction(p);
  const a = { x: p.x + dx * start, y: p.y + dy * start };
  const b = { x: p.x + dx * (start + len), y: p.y + dy * (start + len) };
  // Across: +Y beside a horizontal pin (text above the line), -X beside a vertical one (KiCad's rotated text reads upward, left of the line).
  if (dy === 0) return { minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minY: p.y + lo, maxY: p.y + hi };
  return { minX: p.x - hi, maxX: p.x - lo, minY: Math.min(a.y, b.y), maxY: Math.max(a.y, b.y) };
}

function pinTexts(sym: LibSymbol, p: LibPin): TextBox[] {
  const out: TextBox[] = [];
  const style = sym.pinText;
  const nameShown = !style.namesHidden && visibleText(p.name);
  const numberShown = !style.numbersHidden && visibleText(p.number);
  const label = (kind: string, text: string): string => `pin ${kind} "${text}" (pin ${p.number})`;
  if (style.namesOffset > 0) {
    if (nameShown) out.push({ pin: p, what: label("name", p.name), box: run(p, p.length + style.namesOffset, textWidth(p.name), -GRID / 2, GRID / 2) });
    if (numberShown) {
      const w = textWidth(p.number);
      out.push({ pin: p, what: label("number", p.number), box: run(p, (p.length - w) / 2, w, 0, ACROSS) });
    }
  } else {
    // Offset 0: the name sits beside the pin line on one side, the number on the other.
    if (nameShown) {
      const w = textWidth(p.name);
      out.push({ pin: p, what: label("name", p.name), box: run(p, (p.length - w) / 2, w, 0, ACROSS) });
    }
    if (numberShown) {
      const w = textWidth(p.number);
      out.push({ pin: p, what: label("number", p.number), box: run(p, (p.length - w) / 2, w, -ACROSS, 0) });
    }
  }
  return out;
}

/**
 * The smallest gap texts of two different pins keep, 0.254 mm. Below it, KiCad's glyphs (which
 * reach past the nominal text height) touch: the stock W25Q128JVS draws GND 0.13 mm under
 * HOLD/RESET/IO3. A pin's own name and number are placed by KiCad on opposite sides of its line
 * (offset 0) or apart along it, with the line gap already inside ACROSS, so they only need not
 * overlap: the extra gap would refuse every offset-0 pin against itself.
 */
const MIN_GAP: Um = 254;

function tooClose(a: TextBox, b: TextBox): boolean {
  const gap = a.pin === b.pin ? 0 : MIN_GAP;
  const p = a.box;
  const q = b.box;
  return p.minX < q.maxX + gap && q.minX < p.maxX + gap && p.minY < q.maxY + gap && q.minY < p.maxY + gap;
}

/** Units of `sym` (pins of unit 0 are common to all of them); a single-unit symbol is unit 1. */
function unitsOf(sym: LibSymbol): number[] {
  const units = [...new Set(sym.pins.map((p) => p.unit).filter((u) => u !== 0))].sort((a, b) => a - b);
  return units.length === 0 ? [1] : units;
}

/** Every pair of pin texts of one unit of `sym` closer than MIN_GAP, as "<what> overlaps <what>". */
function unitOverlaps(sym: LibSymbol, unit: number): string[] {
  const out: string[] = [];
  const texts = sym.pins.filter((p) => (p.unit === unit || p.unit === 0) && !p.hidden).flatMap((p) => pinTexts(sym, p));
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      const a = texts[i]!;
      const b = texts[j]!;
      if (tooClose(a, b)) out.push(`${a.what} overlaps ${b.what}`);
    }
  }
  return out;
}

/** Every pair of overlapping pin texts within one unit of `sym`; empty when the symbol is clean. */
export function symbolTextOverlaps(sym: LibSymbol): string[] {
  return unitsOf(sym).flatMap((unit) => unitOverlaps(sym, unit).map((o) => `${sym.libId} unit ${unit}: ${o}`));
}

/** What placedSymbolTextOverlaps needs of a placed part. */
export interface PlacedPart {
  readonly label: string;
  readonly libId: string;
  readonly units: readonly number[];
}

/**
 * The self-check over every symbol a design places, stock and custom alike (Task 10 ruling): each
 * placed unit of each symbol once, naming the parts that place it. A stock symbol that fails is
 * replaced by a corrected copy in the project library; stock symbols are never edited.
 */
export function placedSymbolTextOverlaps(parts: Iterable<PlacedPart>, symbols: SymbolResolver): string[] {
  const placers = new Map<string, string[]>();
  for (const p of parts) {
    for (const u of p.units) {
      const key = `${p.libId}\u0000${u}`;
      placers.set(key, [...(placers.get(key) ?? []), p.label]);
    }
  }
  const out: string[] = [];
  for (const [key, labels] of [...placers].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const [libId, unit] = key.split("\u0000");
    if (libId === undefined || unit === undefined) throw new Error(`internal: malformed placement key ${key}`);
    const where = `${libId} unit ${unit} (placed as ${labels.join(", ")})`;
    out.push(...unitOverlaps(symbols.resolve(libId), Number(unit)).map((o) => `${where}: ${o}`));
  }
  return out;
}
