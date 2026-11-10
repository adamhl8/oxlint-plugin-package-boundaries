import { describe, expect, it } from "bun:test"

import { PROJECT_DIRECTORY, ROOT_DIRECTORY, toFixturePath } from "#__tests__/project.ts"
import { findDeepImport } from "#no-deep-imports.ts"

/** Returns what `findDeepImport` finds for an import between two modules of the fixture's root package. */
const findFixtureDeepImport = (importerModule: string, importedModule: string) =>
  findDeepImport(ROOT_DIRECTORY, toFixturePath(importerModule), toFixturePath(importedModule))

describe("findDeepImport", () => {
  it.each([
    {
      description: "a module inside a sibling package",
      imported: "lib/internal.ts",
      package: "lib",
      mainModule: "lib/lib.ts",
    },
    {
      description: "a module in a package nested inside another",
      imported: "lib/nested/deep.ts",
      package: "lib",
      mainModule: "lib/lib.ts",
    },
    {
      description: "a nested package's main module",
      imported: "lib/nested/nested.ts",
      package: "lib",
      mainModule: "lib/lib.ts",
    },
    {
      description: "a module inside a subpackage",
      imported: "app/feature/part.ts",
      package: "app/feature",
      mainModule: "app/feature/feature.ts",
    },
  ])("should find $description", ({ imported, package: packagePath, mainModule }) => {
    expect(findFixtureDeepImport("app/uses-lib.ts", imported)).toStrictEqual({
      module: imported,
      package: packagePath,
      mainModule,
    })
  })

  it.each([
    ["a sibling package's main module", "app/uses-lib.ts", "lib/lib.ts"],
    ["a subpackage's main module", "app/uses-lib.ts", "app/feature/feature.ts"],
    ["a sibling module", "app/uses-lib.ts", "app/helper.ts"],
    ["shared code in a package that holds the importer", "app/feature/part.ts", "utils.ts"],
    ["the root package's main module", "app/feature/part.ts", "index.ts"],
  ])("should allow %s", (_, importerModule, importedModule) => {
    expect(findFixtureDeepImport(importerModule, importedModule)).toBeUndefined()
  })

  it("should skip an importer outside the root", () => {
    const importerPath = `${PROJECT_DIRECTORY}/scripts/build.ts`

    expect(findDeepImport(ROOT_DIRECTORY, importerPath, toFixturePath("lib/internal.ts"))).toBeUndefined()
  })
})
