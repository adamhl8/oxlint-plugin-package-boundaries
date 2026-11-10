import { describe, expect, it } from "bun:test"
import { utimes } from "node:fs/promises"
import path from "node:path"

import { makeTempDir } from "@adamhl8/configs/test"
import bun from "bun"
import { parseSync } from "oxc-parser"

import { PROJECT_DIRECTORY, ROOT_DIRECTORY, toFixturePath } from "#__tests__/project.ts"
import { findPackageDirectory, getRuntimeReach, resolveImport, toImportSource } from "#imports/imports.ts"

/** Parses `code` and returns what each top-level statement imports. */
const readImportSources = (code: string) =>
  parseSync("module.ts", code).program.body.map((statement) => toImportSource(statement))

/** Returns the modules `modulePath` reaches at runtime, as paths relative to the fixture's `src/`, sorted. */
const getReachedModules = (modulePath: string) =>
  Array.from(getRuntimeReach(toFixturePath(modulePath)), (reachedPath) => path.relative(ROOT_DIRECTORY, reachedPath))
    .map((reachedModule) => reachedModule.split(path.sep).join("/"))
    .toSorted()

describe("toImportSource", () => {
  it("should read each import and re-export, and whether it imports only types", () => {
    const code = [
      `import { a } from "#a.ts"`,
      `import type { B } from "#b.ts"`,
      `import { type C, d } from "#c.ts"`,
      `import { type E } from "#e.ts"`,
      `import "#side-effect.ts"`,
      `export { f } from "#f.ts"`,
      `export type { G } from "#g.ts"`,
      `export * from "#h.ts"`,
      `export type * from "#i.ts"`,
    ].join("\n")

    expect(readImportSources(code)).toStrictEqual([
      { specifier: "#a.ts", isTypeOnly: false },
      { specifier: "#b.ts", isTypeOnly: true },
      { specifier: "#c.ts", isTypeOnly: false },
      { specifier: "#e.ts", isTypeOnly: true },
      { specifier: "#side-effect.ts", isTypeOnly: false },
      { specifier: "#f.ts", isTypeOnly: false },
      { specifier: "#g.ts", isTypeOnly: true },
      { specifier: "#h.ts", isTypeOnly: false },
      { specifier: "#i.ts", isTypeOnly: true },
    ])
  })

  it("should return undefined for statements that import nothing, a dynamic import included", () => {
    const code = [`const a = 1`, `export { a }`, `export const b = 2`, `const c = await import("#c.ts")`].join("\n")

    expect(readImportSources(code)).toStrictEqual([undefined, undefined, undefined, undefined])
  })
})

describe("resolveImport", () => {
  const importerPath = toFixturePath("app/feature/part.ts")

  it.each([
    ["a subpath import", "#lib/lib.ts", "lib/lib.ts"],
    ["a relative import", "../helper.ts", "app/helper.ts"],
  ])("should resolve %s to its file", (_, specifier, modulePath) => {
    expect(resolveImport(importerPath, specifier)).toBe(toFixturePath(modulePath))
  })

  it("should return undefined for a package's specifier", () => {
    expect(resolveImport(importerPath, "node:fs")).toBeUndefined()
  })

  it("should return undefined for a subpath import with no imports map", async () => {
    const directory = await makeTempDir()
    await bun.write(path.join(directory, "package.json"), "{}")

    expect(resolveImport(path.join(directory, "a.ts"), "#b.ts")).toBeUndefined()
  })
})

describe("findPackageDirectory", () => {
  it("should find the folder of the nearest package.json", () => {
    expect(findPackageDirectory(toFixturePath("app/feature/part.ts"))).toBe(PROJECT_DIRECTORY)
  })
})

describe("getRuntimeReach", () => {
  it("should follow runtime imports at any depth, through cycles, and skip type-only imports and packages", () => {
    expect(getReachedModules("app/uses-lib.ts")).toStrictEqual([
      "app/app.ts",
      "app/feature/feature.ts",
      "app/feature/part.ts",
      "app/helper.ts",
      "lib/internal.ts",
      "lib/lib.ts",
      "lib/nested/nested.ts",
      "uses-app.ts",
      "utils.ts",
    ])
  })

  it("should reach nothing from a module that doesn't exist", () => {
    expect(getReachedModules("missing.ts")).toStrictEqual([])
  })

  it("should read a module again once its file changes", async () => {
    const directory = await makeTempDir()
    const modulePath = path.join(directory, "a.ts")
    await bun.write(modulePath, `import { b } from "./b.ts"\n`)
    const before = getRuntimeReach(modulePath)

    await bun.write(modulePath, `import { c } from "./c.ts"\n`)
    // Move the modification time on, because two writes in the same millisecond keep the same one.
    const later = new Date(Date.now() + 10_000)
    await utimes(modulePath, later, later)

    expect([before, getRuntimeReach(modulePath)]).toStrictEqual([
      new Set([path.join(directory, "b.ts")]),
      new Set([path.join(directory, "c.ts")]),
    ])
  })
})
