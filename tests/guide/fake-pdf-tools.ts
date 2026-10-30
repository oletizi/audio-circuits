/**
 * The two PDF-tool overrides every packet test needs, in one place: the merge
 * that joins the schematic page into the printed guide, and the page-size read
 * the printed page's paper notice is built from.
 *
 * **SHARED, BECAUSE FOUR FILES DRIVE `writeGuidePacket` AND NONE OF THEM MAY
 * REACH THE REAL qpdf.** Three write through the in-memory `GuideFs`
 * (`./memory-fs.ts`), where there is no file on disk for a real tool to read,
 * and `tests/cli/perfboard-guide-verb.test.ts` writes a real throwaway tree
 * whose PDFs are the four bytes `%PDF` - which a real merge would refuse, and
 * rightly. A second copy of these fakes would let two files model the merge
 * differently and then disagree about what a packet holds.
 *
 * **THE MERGE FAKE RECORDS AND WRITES; IT DOES NOT PRETEND TO MERGE.** What
 * the real merge guarantees - the page count, and that no page was resized -
 * is `tests/guide/merge-pdf.test.ts`'s subject, against the real tool and real
 * PDFs. What these tests ask is the packet-level question the fake can answer
 * honestly: was the merge CALLED, with the two staged intermediates, and did
 * the intermediates stay out of the published packet.
 */
import { GUIDE_PAPER, type PageSize } from "../../tools/guide/paper.ts"
import type { GuideDeps } from "../../tools/guide/packet.ts"

export interface FakePdfTools {
  readonly mergeSchematicPage: NonNullable<GuideDeps["mergeSchematicPage"]>
  readonly pdfPageSizes: NonNullable<GuideDeps["pdfPageSizes"]>
  /** One entry per merge: `[pdfMerge, guidePdf, schematicPdf, outPath]`. */
  readonly merges: (readonly string[])[]
  /** One entry per page-size read: the PDF it was asked about. */
  readonly measured: string[]
}

/**
 * `write` is the test's own writer - the memory `GuideFs`'s `writeText` or
 * `node:fs`'s - because the merged document has to land wherever that test's
 * packet is being assembled, or the packet comes out a file short.
 *
 * `paper` is what the fake reports the schematic page's size to be, and it
 * defaults to the guide's own paper so a test that says nothing about paper
 * gets the state the project is aiming at: one document, one sheet size, no
 * notice. A test about the notice passes A4 or A3 explicitly.
 */
export function fakePdfTools(
  write: (file: string, text: string) => void,
  paper: PageSize = GUIDE_PAPER,
): FakePdfTools {
  const merges: (readonly string[])[] = []
  const measured: string[] = []
  return {
    merges,
    measured,
    mergeSchematicPage: (pdfMerge, guidePdf, schematicPdf, outPath) => {
      merges.push([pdfMerge, guidePdf, schematicPdf, outPath])
      write(outPath, "%PDF-merged")
    },
    pdfPageSizes: (_pdfMerge, pdf) => {
      measured.push(pdf)
      return [paper]
    },
  }
}
