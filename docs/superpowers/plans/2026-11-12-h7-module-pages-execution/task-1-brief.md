### Task 1: The composition record on `Network`

**Files:**
- Modify: `lib/model/types.ts` (`Network`), `lib/model/include.ts`, `lib/model/builder.ts` (`include`, `done`)
- Modify: every `Network` literal that `bun run typecheck` names once the field is required
- Test: `tests/model/include-blocks.test.ts`

**Interfaces:**
- Produces `Network.blocks: readonly BlockRecord[]`, which is required. A network built with no `include()` has `[]`.
- `BlockRecord` is `{ prefix: string; componentIds: readonly string[]; ports: Readonly<Record<string, string>> }`. `ports` maps the included network's port name to the parent net it was bound to. `componentIds` are the prefixed ids.
- Produces `blockOf(network: Network, componentId: string): string | null`. It returns the prefix of the block holding the component, or null for a part added at top level.
- **Controller ruling: nested includes are recorded as one level.** When an included network itself has blocks, `include()` refuses, with a message saying nested composition is not yet drawn (C3 draws one level) and naming the inner prefixes. A refusal, not a flattening that loses the inner boundary.

- [ ] **Step 1: Write the failing tests:**
  - `"a network with no include has no blocks"`;
  - `"include records its prefix, prefixed component ids and port bindings"`, using two small blocks that share a port net `3V3` and each have a private net `FB`. Assert two records, and that the private nets are `a_FB` and `b_FB`. Because of that prefixing, a test of name collisions across sheets has to give two nets the same label text deliberately; see Task 5, control 3;
  - `"blockOf names the block, and null for a top-level part"`;
  - `"including a network that has blocks refuses, naming the inner prefixes"`.
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test tests/model/include-blocks.test.ts`.
- [ ] **Step 3: Implement.** `Builder.include` appends the record, and `done()` keeps it. Fix the `Network` literals that typecheck names, adding `blocks: []` or spreading an existing network.
- [ ] **Step 4: Verify.** Run `bun test` (whole suite, apart from the pre-existing failures) and `bun run typecheck`. Commit and push.

