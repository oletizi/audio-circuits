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

test("readDigikeyCredentials reads the client id and secret", () => {
  const credentials = readDigikeyCredentials(
    readFileFrom({ [DIGIKEY_PATH]: "client-id-value\nclient-secret-value\n" }),
    HOME,
  )
  expect(credentials).toEqual({ clientId: "client-id-value", clientSecret: "client-secret-value" })
})

test("readDigikeyCredentials trims surrounding whitespace on each line", () => {
  const credentials = readDigikeyCredentials(
    readFileFrom({ [DIGIKEY_PATH]: "  client-id-value  \n  client-secret-value  \n" }),
    HOME,
  )
  expect(credentials).toEqual({ clientId: "client-id-value", clientSecret: "client-secret-value" })
})

test("readDigikeyCredentials refuses a missing file, naming the path, shape and registration page", () => {
  expect(() => readDigikeyCredentials(readFileFrom({}), HOME)).toThrow(
    /\/home\/fixture\/\.config\/digikey\/digikey-credentials\.txt.*two lines.*developer\.digikey\.com/s,
  )
})

test("readDigikeyCredentials refuses a file with only one non-blank line", () => {
  expect(() => readDigikeyCredentials(readFileFrom({ [DIGIKEY_PATH]: "client-id-value\n" }), HOME)).toThrow(
    /expected two lines.*found 1 non-blank line/s,
  )
})

test("readDigikeyCredentials refuses an empty file", () => {
  expect(() => readDigikeyCredentials(readFileFrom({ [DIGIKEY_PATH]: "\n" }), HOME)).toThrow(
    /expected two lines.*found 0 non-blank line/s,
  )
})

test("readDigikeyCredentials refuses a file with three non-blank lines", () => {
  expect(() =>
    readDigikeyCredentials(readFileFrom({ [DIGIKEY_PATH]: "a\nb\nc\n" }), HOME),
  ).toThrow(/found 3 non-blank line/)
})
