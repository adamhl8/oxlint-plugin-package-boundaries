import { describe, expect, it } from "bun:test"

import { PROJECT_DIRECTORY, ROOT_DIRECTORY, toFixturePath } from "#__tests__/project.ts"
import { findUpwardImport } from "#no-upward-imports.ts"

/** Returns what `findUpwardImport` finds for an import between two modules of the fixture's root package. */
const findFixtureUpwardImport = (importerModule: string, importedModule: string) =>
  findUpwardImport(ROOT_DIRECTORY, toFixturePath(importerModule), toFixturePath(importedModule))

describe("findUpwardImport", () => {
  it("should find an import of the main module of the importer's own package", () => {
    expect(findFixtureUpwardImport("app/feature/part.ts", "app/feature/feature.ts")).toStrictEqual({
      kind: "ownMainModule",
      module: "app/feature/feature.ts",
    })
  })

  it.each([
    ["a holding package's main module", "app/app.ts", "app/feature"],
    ["shared code that reaches back into the importer's branch", "uses-app.ts", "app"],
  ])("should find an import of %s", (_, importedModule, branch) => {
    expect(findFixtureUpwardImport("app/feature/part.ts", importedModule)).toStrictEqual({
      kind: "usesOwnPackage",
      module: importedModule,
      branch,
    })
  })

  it.each([
    ["shared code in a holding package that doesn't reach the branch", "app/feature/part.ts", "app/helper.ts"],
    ["shared code at the root", "app/feature/part.ts", "utils.ts"],
    ["a sibling module", "app/uses-lib.ts", "app/helper.ts"],
    ["another package", "app/uses-lib.ts", "lib/lib.ts"],
    ["the importer itself", "app/app.ts", "app/app.ts"],
  ])("should allow %s", (_, importerModule, importedModule) => {
    expect(findFixtureUpwardImport(importerModule, importedModule)).toBeUndefined()
  })

  it("should skip an importer outside the root", () => {
    const importerPath = `${PROJECT_DIRECTORY}/scripts/build.ts`

    expect(findUpwardImport(ROOT_DIRECTORY, importerPath, toFixturePath("app/app.ts"))).toBeUndefined()
  })
})
