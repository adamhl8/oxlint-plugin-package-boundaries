import { describe, expect, it } from "bun:test"
import path from "node:path"

import {
  getBranch,
  getFolderName,
  getModuleStem,
  getPackagePath,
  getSiblingPackages,
  holdsPackage,
  isIndexModule,
  isInTestsFolder,
  isTestCode,
  isTestFile,
  toModulePath,
} from "#layout.ts"

const ROOT = path.join(path.sep, "project", "src")

describe("toModulePath", () => {
  it("should return a module's path relative to the root, with / separators", () => {
    expect(toModulePath(ROOT, path.join(ROOT, "app", "feature", "part.ts"))).toBe("app/feature/part.ts")
  })

  it.each([
    ["the root folder itself", ROOT],
    ["a module beside the root", path.join(ROOT, "..", "scripts", "build.ts")],
    ["a module in a folder whose name starts like the root's", path.join(`${ROOT}-other`, "a.ts")],
  ])("should return undefined for %s", (_, absolutePath) => {
    expect(toModulePath(ROOT, absolutePath)).toBeUndefined()
  })
})

describe("getPackagePath", () => {
  it.each([
    ["app/feature/part.ts", "app/feature"],
    ["app/app.ts", "app"],
    ["index.ts", ""],
  ])("should put %s in package '%s'", (modulePath, packagePath) => {
    expect(getPackagePath(modulePath)).toBe(packagePath)
  })
})

describe("holdsPackage", () => {
  it.each([
    ["", "app/feature"],
    ["app", "app/feature"],
    ["app", "app"],
  ])("should report that '%s' holds '%s'", (packagePath, otherPackagePath) => {
    expect(holdsPackage(packagePath, otherPackagePath)).toBe(true)
  })

  it.each([
    ["app/feature", "app"],
    ["app", "application"],
    ["lib", "app"],
  ])("should report that '%s' doesn't hold '%s'", (packagePath, otherPackagePath) => {
    expect(holdsPackage(packagePath, otherPackagePath)).toBe(false)
  })
})

describe("getBranch", () => {
  it.each([
    ["", "app/feature", "app"],
    ["app", "app/feature/deep", "app/feature"],
  ])("should find the package inside '%s' that leads to '%s'", (packagePath, otherPackagePath, branch) => {
    expect(getBranch(packagePath, otherPackagePath)).toBe(branch)
  })
})

describe("getSiblingPackages", () => {
  it.each([
    { importerPackage: "app/feature", importedPackage: "lib", importerSide: "app", importedSide: "lib" },
    {
      importerPackage: "app/feature/deep",
      importedPackage: "app/other",
      importerSide: "app/feature",
      importedSide: "app/other",
    },
    { importerPackage: "app", importedPackage: "application", importerSide: "app", importedSide: "application" },
  ])(
    "should find the siblings an import from '$importerPackage' to '$importedPackage' crosses between",
    ({ importerPackage, importedPackage, importerSide, importedSide }) => {
      expect(getSiblingPackages(importerPackage, importedPackage)).toStrictEqual([importerSide, importedSide])
    },
  )

  it.each([
    ["the same package", "app", "app"],
    ["a package the importer holds", "app", "app/feature"],
    ["a package that holds the importer", "app/feature", "app"],
    ["the root package", "app/feature", ""],
    ["any package, from the root package", "", "lib"],
  ])("should return undefined for %s", (_, importerPackage, importedPackage) => {
    expect(getSiblingPackages(importerPackage, importedPackage)).toBeUndefined()
  })
})

describe("getModuleStem", () => {
  it.each([
    ["shell/shell.ts", "shell"],
    ["bask/bask.base.ts", "bask"],
    ["parser.test.ts", "parser"],
    ["types.d.ts", "types"],
  ])("should give %s the stem '%s'", (modulePath, stem) => {
    expect(getModuleStem(modulePath)).toBe(stem)
  })
})

describe("getFolderName", () => {
  it.each([
    ["app/feature/part.ts", "feature"],
    ["utils.ts", ""],
  ])("should find the folder %s is in", (modulePath, folderName) => {
    expect(getFolderName(modulePath)).toBe(folderName)
  })
})

describe("test code", () => {
  it.each(["parser.test.ts", "app/button.spec.tsx", "app/__tests__/a.test.mts"])(
    "should treat %s as a test file",
    (modulePath) => {
      expect(isTestFile(modulePath)).toBe(true)
    },
  )

  it.each(["parser.ts", "testing.ts", "app/test.ts", "app/__tests__/helper.ts"])(
    "should not treat %s as a test file",
    (modulePath) => {
      expect(isTestFile(modulePath)).toBe(false)
    },
  )

  it("should find a tests folder at any depth, and only by its exact name", () => {
    expect([
      isInTestsFolder("app/__tests__/helper.ts", "__tests__"),
      isInTestsFolder("app/__tests__/fixtures/project/src/a.ts", "__tests__"),
      isInTestsFolder("app/__tests__x/a.ts", "__tests__"),
      isInTestsFolder("app/tests/a.ts", "tests"),
    ]).toStrictEqual([true, true, false, true])
  })

  it("should treat a test file and anything in a tests folder as test code", () => {
    expect([
      isTestCode("app/parser.test.ts", "__tests__"),
      isTestCode("app/__tests__/helper.ts", "__tests__"),
      isTestCode("app/helper.ts", "__tests__"),
    ]).toStrictEqual([true, true, false])
  })
})

describe("isIndexModule", () => {
  it.each(["index.ts", "env/index.ts", "index.d.ts"])("should treat %s as an index file", (modulePath) => {
    expect(isIndexModule(modulePath)).toBe(true)
  })

  it.each(["indexes.ts", "task-index.ts", "index/main.ts"])("should not treat %s as an index file", (modulePath) => {
    expect(isIndexModule(modulePath)).toBe(false)
  })
})
