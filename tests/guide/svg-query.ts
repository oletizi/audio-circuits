/**
 * Small readers for the guide's rendered SVG, shared by the render and
 * packet tests: an element's attributes, the elements of one class, a
 * hole's drawn centre and a cut cross's centre.
 */

export interface At {
  readonly x: number
  readonly y: number
}

export function attr(element: string, name: string): string {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(element)
  if (match === null || match[1] === undefined) {
    throw new Error(`test: no ${name} attribute on ${element}`)
  }
  return match[1]
}

export function num(element: string, name: string): number {
  return Number(attr(element, name))
}

export function elements(svg: string, tag: string, cls: string): string[] {
  return [...svg.matchAll(new RegExp(`<${tag}\\s[^>]*class="${cls}"[^>]*>`, "g"))].map((m) => m[0])
}

export function holeCentre(svg: string, name: string): At {
  const hole = elements(svg, "circle", "hole").find((el) => attr(el, "data-hole") === name)
  if (hole === undefined) {
    throw new Error(`test: no hole ${name}`)
  }
  return { x: num(hole, "cx"), y: num(hole, "cy") }
}

/** The centre of cut `n`'s cross: the midpoint of the first of its two strokes. */
export function cutCentre(svg: string, n: number): At {
  const group = new RegExp(`<g class="cut" data-cut="${n}">(.*?)</g>`).exec(svg)
  const stroke = group?.[1]?.match(/<line\s[^>]*>/)?.[0]
  if (stroke === undefined) {
    throw new Error(`test: no cut ${n}`)
  }
  return { x: (num(stroke, "x1") + num(stroke, "x2")) / 2, y: (num(stroke, "y1") + num(stroke, "y2")) / 2 }
}

/** A line element's two ends. */
export function lineEnds(element: string): readonly [At, At] {
  return [
    { x: num(element, "x1"), y: num(element, "y1") },
    { x: num(element, "x2"), y: num(element, "y2") },
  ]
}
