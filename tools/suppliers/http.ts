/**
 * The one place a supplier client turns an HTTP response into JSON or a refusal.
 * `url` (which carries the API key in the query string, for the suppliers that put
 * it there) is used only to make the request; every error names `endpointPath`
 * instead, so a key never reaches an error message, a log or a fixture.
 */
import type { FetchLike, SupplierName } from "./types.ts"

export async function postJson(
  fetch: FetchLike,
  supplier: SupplierName,
  url: string,
  endpointPath: string,
  body: unknown,
): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const text = await response.text()

  if (response.status < 200 || response.status >= 300) {
    const message = text.trim() === "" ? "(no response body)" : text.trim()
    throw new Error(`${supplier} ${endpointPath} request failed (HTTP ${response.status}): ${message}`)
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${supplier} ${endpointPath}: response body was not valid JSON: ${detail}`)
  }
  return json
}
