// tests/draught/doctor.test.ts
import { expect, test } from "bun:test"
import { renderToolchainReport } from "../../tools/cli/draught.ts"

test("the report names the tool, what is wanted, what was found and how to fix it", () => {
  const text = renderToolchainReport([
    { tool: "akcli", wanted: "0.22.0", found: "0.21.0", how: "pip install 'akcli-kicad==0.22.0'" },
  ])
  expect(text).toContain("akcli")
  expect(text).toContain("0.22.0")
  expect(text).toContain("0.21.0")
  expect(text).toContain("pip install 'akcli-kicad==0.22.0'")
})

test("an empty problem list renders a line saying the toolchain matches, not an empty string", () => {
  expect(renderToolchainReport([]).trim()).not.toBe("")
})
