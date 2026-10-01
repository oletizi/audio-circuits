/**
 * The one place a supplier client turns an HTTP response into JSON or a refusal.
 * `url` (which carries the API key in the query string, for the suppliers that put
 * it there) is used only to make the request; every error names `endpointPath`
 * instead, so a key never reaches an error message, a log or a fixture.
 *
 * That includes a `fetch` that rejects outright (DNS failure, connection refused, TLS):
 * the runtime's own error for that can carry the full request URL, so it is never passed
 * on - only its `name` is, under a message this module writes itself. A response body
 * that echoes the request URL back is likewise rewritten to name the endpoint path.
 */
import type { FetchLike, SupplierName } from "./types.ts"

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error
}

export async function postJson(
  fetch: FetchLike,
  supplier: SupplierName,
  url: string,
  endpointPath: string,
  body: unknown,
): Promise<unknown> {
  let response: Awaited<ReturnType<FetchLike>>
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw new Error(
      `${supplier} ${endpointPath}: request could not be sent (${errorName(error)}). Check the ` +
        "network connection and try again.",
    )
  }

  let text: string
  try {
    text = await response.text()
  } catch (error) {
    throw new Error(`${supplier} ${endpointPath}: the response body could not be read (${errorName(error)}).`)
  }

  if (response.status < 200 || response.status >= 300) {
    const trimmed = text.trim().split(url).join(endpointPath)
    const message = trimmed === "" ? "(no response body)" : trimmed
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
