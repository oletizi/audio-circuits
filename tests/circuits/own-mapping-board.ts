import type { Network } from "../../lib/model/types.ts"

/**
 * A board whose own module supplies its designators and pin numbers, so neither is derived by the
 * Pultec rules in `./sheet-model.ts`. `pinNumbers` is built from the module's own kind-keyed table
 * (`pinNumbersFromTable` in `lib/kicad/from-network.ts`); a pin that table does not number refuses
 * and names it.
 */
export interface OwnMappingBoard {
  readonly board: string
  /** The circuit module, repository-relative, checked against the board's own manifest. */
  readonly module: string
  /** The exported builder's name, checked against the board's own manifest. */
  readonly exportName: string
  readonly build: () => Network
  readonly designators: ReadonlyMap<string, string>
  /** Built from the model when asked, so a refusal surfaces in the test that asks and not at import. */
  readonly pinNumbers: (network: Network) => ReadonlyMap<string, ReadonlyMap<string, string>>
}
