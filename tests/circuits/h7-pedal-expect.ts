/**
 * The h7-pedal block tests' shared check (h7 pedal pages plan, Task 6): a block's parts written out
 * from the sources, one expectation per part, and the block compared against them.
 *
 * Each expectation is written from the documents, NOT from the block's module: its kind, value, the
 * net on every pin, its MPN where the sources give one, and the lines it comes from. Each cited line
 * is read and must contain the quoted text, so an expectation cannot cite a line that does not say
 * what it is used for. The block must hold exactly the expected parts, no more and no fewer.
 */
import fs from "node:fs"
import path from "node:path"
import { expect } from "bun:test"
import type { Component, Connection, Network } from "../../lib/model/index.ts"

const REPO = path.join(import.meta.dir, "../..")

/** A cited line and the text it must contain. A bare name is under `docs/h7-platform/`. */
export type Cite = readonly [string, string]

export interface PartExpectation {
  readonly id: string
  readonly kind: Component["kind"]
  /** ohms, farads or henries; omitted for a part whose kind carries no value. */
  readonly value?: number
  /** Pin -> net, or "NC" for a no-connect. A dual op-amp's unit pins are keyed `A/in+`. */
  readonly pins: Readonly<Record<string, string>>
  readonly mpn?: string
  readonly symbol?: string
  readonly cites: readonly Cite[]
}

function lineText(cite: string): string {
  const at = cite.lastIndexOf(":")
  const file = cite.slice(0, at)
  const line = Number(cite.slice(at + 1))
  const full = file.includes("/") ? path.join(REPO, file) : path.join(REPO, "docs/h7-platform", file)
  return fs.readFileSync(full, "utf8").split("\n")[line - 1] ?? ""
}

function connectionText(c: Connection | undefined): string {
  if (c === undefined) return "(absent)"
  return c.kind === "net" ? c.net : "NC"
}

/** Every pin of a component, keyed as the expectation keys it. */
function pinsOf(c: Component): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [pin, conn] of Object.entries(c.pins)) out[pin] = connectionText(conn)
  for (const unit of c.units) {
    for (const [pin, conn] of Object.entries(unit.pins)) out[c.units.length > 1 ? `${unit.name}/${pin}` : pin] = connectionText(conn)
  }
  return out
}

function valueOf(c: Component): number | undefined {
  const p = c.parameters
  if ("ohms" in p) return p.ohms
  if ("farads" in p) return p.farads
  if ("henries" in p) return p.henries
  return undefined
}

/** The block holds exactly these parts, each as expected, and every cited line says what it is cited for. */
export function expectBlock(block: Network, expected: readonly PartExpectation[]): void {
  expect(block.components.map((c) => c.id).sort()).toEqual(expected.map((e) => e.id).sort())
  for (const e of expected) {
    const c = block.components.find((x) => x.id === e.id)
    if (c === undefined) throw new Error(`the block has no "${e.id}"`)
    expect([e.id, c.kind]).toEqual([e.id, e.kind])
    if (e.value !== undefined) {
      const v = valueOf(c)
      if (v === undefined) throw new Error(`"${e.id}" carries no value`)
      expect([e.id, v]).toEqual([e.id, expect.closeTo(e.value, 15)])
    }
    expect([e.id, pinsOf(c)]).toEqual([e.id, { ...e.pins }])
    if (e.mpn !== undefined) expect([e.id, c.part?.mpn]).toEqual([e.id, e.mpn])
    if (e.symbol !== undefined) expect([e.id, c.part?.symbol]).toEqual([e.id, e.symbol])
    expect(e.cites.length).toBeGreaterThan(0)
    for (const [cite, text] of e.cites) expect([e.id, cite, lineText(cite).includes(text)]).toEqual([e.id, cite, true])
  }
}

/** The block's ports, each named by the net it carries. */
export function expectPorts(block: Network, ports: readonly string[]): void {
  expect(Object.keys(block.ports).sort()).toEqual([...ports].sort())
  for (const p of ports) expect(block.ports[p]).toBe(p)
}
