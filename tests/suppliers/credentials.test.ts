import { test, expect } from "bun:test"
import { readMouserCredentials, readDigikeyCredentials } from "../../tools/suppliers/credentials.ts"

const HOME = "/home/fixture"
const MOUSER_PATH = "/home/fixture/.config/mouser/mouser-credentials.txt"
const DIGIKEY_PATH = "/home/fixture/.config/digikey/digikey-credentials.txt"

function readFileFrom(files: Record<string, string>): (path: string) => string {
  return (path: string) => {
    const text = files[path]
    if (text === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`)
    }
    return text
  }
}

test("readMouserCredentials reads the one-line key", () => {
  const credentials = readMouserCredentials(readFileFrom({ [MOUSER_PATH]: "SECRET-KEY-VALUE\n" }), HOME)
  expect(credentials).toEqual({ apiKey: "SECRET-KEY-VALUE" })
})

test("readMouserCredentials trims surrounding whitespace", () => {
  const credentials = readMouserCredentials(readFileFrom({ [MOUSER_PATH]: "  SECRET-KEY-VALUE  \n\n" }), HOME)
  expect(credentials).toEqual({ apiKey: "SECRET-KEY-VALUE" })
})

test("readMouserCredentials refuses a missing file, naming the path, shape and registration page", () => {
  expect(() => readMouserCredentials(readFileFrom({}), HOME)).toThrow(
    /\/home\/fixture\/\.config\/mouser\/mouser-credentials\.txt.*one line.*API Hub in a Mouser account/s,
  )
})

test("readMouserCredentials refuses a file with more than one non-blank line", () => {
  expect(() =>
    readMouserCredentials(readFileFrom({ [MOUSER_PATH]: "SECRET-KEY-VALUE\nEXTRA-LINE\n" }), HOME),
  ).toThrow(/expected one line.*found 2 non-blank line/s)
})

test("readMouserCredentials refuses an empty file", () => {
  expect(() => readMouserCredentials(readFileFrom({ [MOUSER_PATH]: "\n" }), HOME)).toThrow(
    /found 0 non-blank line/,
  )
})

test("readMouserCredentials never puts the key text in an error message", () => {
  let thrown: unknown
  try {
    readMouserCredentials(readFileFrom({ [MOUSER_PATH]: "SECRET-KEY-VALUE\nEXTRA-LINE\n" }), HOME)
  } catch (error) {
    thrown = error
  }
  expect(thrown).toBeInstanceOf(Error)
  const message = thrown instanceof Error ? thrown.message : ""
  expect(message).not.toContain("SECRET-KEY-VALUE")
  expect(message).not.toContain("EXTRA-LINE")
})

test("readDigikeyCredentials reads the clientID and clientSecret mapping", () => {
  const credentials = readDigikeyCredentials(
    readFileFrom({ [DIGIKEY_PATH]: "clientID: client-id-value\nclientSecret: client-secret-value\n" }),
    HOME,
  )
  expect(credentials).toEqual({ clientId: "client-id-value", clientSecret: "client-secret-value" })
})

test("readDigikeyCredentials accepts either order and surrounding whitespace", () => {
  const credentials = readDigikeyCredentials(
    readFileFrom({ [DIGIKEY_PATH]: "\nclientSecret:   client-secret-value  \nclientID:  client-id-value\n\n" }),
    HOME,
  )
  expect(credentials).toEqual({ clientId: "client-id-value", clientSecret: "client-secret-value" })
})

test("readDigikeyCredentials refuses a missing file, naming the path, shape and registration page", () => {
  expect(() => readDigikeyCredentials(readFileFrom({}), HOME)).toThrow(
    /\/home\/fixture\/\.config\/digikey\/digikey-credentials\.txt.*clientID.*clientSecret.*developer\.digikey\.com/s,
  )
})

/** Every refusal below must name the file and the expected shape, and never echo a value. */
function refusal(text: string): string {
  let thrown: unknown
  try {
    readDigikeyCredentials(readFileFrom({ [DIGIKEY_PATH]: text }), HOME)
  } catch (error) {
    thrown = error
  }
  expect(thrown).toBeInstanceOf(Error)
  const message = thrown instanceof Error ? thrown.message : ""
  expect(message).toContain(DIGIKEY_PATH)
  expect(message).toContain("clientID")
  expect(message).toContain("clientSecret")
  expect(message).not.toContain("SECRET-VALUE")
  expect(message).not.toContain("ID-VALUE")
  return message
}

test("readDigikeyCredentials refuses an empty file", () => {
  expect(refusal("\n")).toMatch(/not a mapping/)
})

test("readDigikeyCredentials refuses a file that is not a mapping", () => {
  expect(refusal("ID-VALUE\nSECRET-VALUE\n")).toMatch(/not a mapping/)
  expect(refusal("- ID-VALUE\n- SECRET-VALUE\n")).toMatch(/not a mapping/)
})

test("readDigikeyCredentials refuses a missing key", () => {
  expect(refusal("clientID: ID-VALUE\n")).toMatch(/"clientSecret" is missing/)
  expect(refusal("clientSecret: SECRET-VALUE\n")).toMatch(/"clientID" is missing/)
})

test("readDigikeyCredentials refuses a key with the wrong label case", () => {
  expect(refusal("clientId: ID-VALUE\nclientSecret: SECRET-VALUE\n")).toMatch(/unexpected key "clientId"/)
})

test("readDigikeyCredentials refuses extra keys, naming the key but not its value", () => {
  expect(refusal("clientID: ID-VALUE\nclientSecret: SECRET-VALUE\nscope: SECRET-VALUE\n")).toMatch(
    /unexpected key "scope"/,
  )
})

test("readDigikeyCredentials refuses a non-string or empty value", () => {
  expect(refusal("clientID: 12345\nclientSecret: SECRET-VALUE\n")).toMatch(/"clientID" is not a non-empty string/)
  expect(refusal("clientID: ID-VALUE\nclientSecret:\n")).toMatch(/"clientSecret" is not a non-empty string/)
  expect(refusal('clientID: ID-VALUE\nclientSecret: "  "\n')).toMatch(/"clientSecret" is not a non-empty string/)
})

test("readDigikeyCredentials refuses a YAML syntax error without passing on the parser's message", () => {
  const message = refusal('clientID: "ID-VALUE\nclientSecret: [SECRET-VALUE\n')
  expect(message).toMatch(/not valid YAML/)
})
