/**
 * The one place a supplier client turns an HTTP response into JSON or a refusal.
 * `url` (which carries the API key in the query string, for the suppliers that put
 * it there) is used only to make the request; every error names `endpointPath`
 * instead, so a key never reaches an error message, a log or a fixture.
 *
 * That includes a `fetch` that rejects outright (DNS failure, connection refused, TLS):
 * the runtime's own error for that can carry the full request URL, so it is never passed
 * on - only its `name` is, under a message this module writes itself. A response body
 * that echoes the request URL back is likewise rewritten to name the endpoint path, and
 * every string in `secrets` (a client ID, a client secret, a bearer token) is replaced by
 * `<redacted>` wherever such a body is quoted.
 */
import type { FetchLike, SupplierName } from "./types.ts"

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error
}

export interface JsonRequest {
  readonly method: "GET" | "POST"
  /** Used only to send the request; never named in an error. */
  readonly url: string
  /** What every error names in place of `url`. */
  readonly endpointPath: string
  readonly headers: Record<string, string>
  readonly body?: string
  /** Values that must never appear in an error, redacted from any quoted response body. */
  readonly secrets: readonly string[]
  /** Non-2xx statuses the caller handles itself (Digi-Key's 404 for a product it does not
   * list): returned, with the parsed body, rather than refused. */
  readonly passStatuses?: readonly number[]
}

export interface JsonResponse {
  readonly status: number
  readonly json: unknown
}

function redact(text: string, request: JsonRequest): string {
  let out = text.split(request.url).join(request.endpointPath)
  for (const secret of request.secrets) {
    if (secret !== "") out = out.split(secret).join("<redacted>")
  }
  return out
}

export async function requestJson(fetch: FetchLike, supplier: SupplierName, request: JsonRequest): Promise<JsonResponse> {
  const { endpointPath } = request
  let response: Awaited<ReturnType<FetchLike>>
  try {
    response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      ...(request.body !== undefined ? { body: request.body } : {}),
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

  const passed = request.passStatuses?.includes(response.status) === true
  if ((response.status < 200 || response.status >= 300) && !passed) {
    const trimmed = redact(text.trim(), request)
    const message = trimmed === "" ? "(no response body)" : trimmed
    throw new Error(`${supplier} ${endpointPath} request failed (HTTP ${response.status}): ${message}`)
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    const detail = error instanceof Error ? redact(error.message, request) : String(error)
    throw new Error(`${supplier} ${endpointPath}: response body was not valid JSON: ${detail}`)
  }
  return { status: response.status, json }
}

export async function postJson(
  fetch: FetchLike,
  supplier: SupplierName,
  url: string,
  endpointPath: string,
  body: unknown,
): Promise<unknown> {
  const response = await requestJson(fetch, supplier, {
    method: "POST",
    url,
    endpointPath,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    secrets: [],
  })
  return response.json
}
