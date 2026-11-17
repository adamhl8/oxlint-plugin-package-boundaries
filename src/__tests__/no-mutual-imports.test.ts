import { beforeAll, describe, expect, it } from "bun:test"
import path from "node:path"

import { makeTempDir } from "@adamhl8/configs/test"
import bun from "bun"

import { findRuntimeImportBetween } from "#no-mutual-imports.ts"
import type { Settings } from "#settings.ts"

// Map each module to its code, so each case states exactly what imports what.
const PROJECT_MODULES = {
  "a/uses-b.ts": 'import { b } from "#b/b-value.ts"\nexport const a = b\n',
  "a/value.ts": "export const value = 1\n",
  "b/b-value.ts": "export const b = 1\n",
  "b/types-only.ts": 'import type { a } from "#a/uses-b.ts"\nexport type A = typeof a\n',
  "b/__tests__/b.test.ts": 'import { a } from "#a/uses-b.ts"\nexport const tested = a\n',
  "c/uses-a.ts": 'import { value } from "#a/value.ts"\nexport const c = value\n',
} as const

let settings: Settings = { rootDirectory: "", testsFolder: "__tests__" }

beforeAll(async () => {
  const directory = await makeTempDir()
  await bun.write(path.join(directory, "package.json"), JSON.stringify({ imports: { "#*": "./src/*" } }))
  await Promise.all(
    Object.entries(PROJECT_MODULES).map(async ([modulePath, code]) =>
      bun.write(path.join(directory, "src", modulePath), code),
    ),
  )
  settings = { rootDirectory: path.join(directory, "src"), testsFolder: "__tests__" }
})

describe("findRuntimeImportBetween", () => {
  it("should find a runtime import from one package into another", () => {
    expect(findRuntimeImportBetween(settings, "a", "b")).toStrictEqual({
      importer: "a/uses-b.ts",
      imported: "b/b-value.ts",
    })
  })

  it("should leave out type-only imports and test code", () => {
    expect(findRuntimeImportBetween(settings, "b", "a")).toBeUndefined()
  })

  it("should find nothing in a package with no imports into the other", () => {
    expect(findRuntimeImportBetween(settings, "a", "c")).toBeUndefined()
  })

  it("should find nothing in a package that doesn't exist", () => {
    expect(findRuntimeImportBetween(settings, "missing", "a")).toBeUndefined()
  })
})
