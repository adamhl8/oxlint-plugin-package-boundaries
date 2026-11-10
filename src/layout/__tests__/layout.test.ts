import { describe, expect, it } from "bun:test"
import path from "node:path"

import {
  getBranch,
  getMainModulePath,
  getPackagePath,
  getVisiblePackage,
  holdsPackage,
  isMainModule,
  toModulePath,
} from "#layout/layout.ts"

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

describe("isMainModule", () => {
  it.each(["app/app.ts", "app/feature/feature.tsx", "types/types.d.ts", "index.ts", "index.tsx"])(
    "should treat %s as a main module",
    (modulePath) => {
      expect(isMainModule(modulePath)).toBe(true)
    },
  )

  it.each(["app/helper.ts", "app/feature/app.ts", "utils.ts", "app/index.ts"])(
    "should not treat %s as a main module",
    (modulePath) => {
      expect(isMainModule(modulePath)).toBe(false)
    },
  )
})

describe("getMainModulePath", () => {
  it("should name a package's main module after it, with the extension of the module given", () => {
    expect(getMainModulePath("app/feature", "app/feature/part.tsx")).toBe("app/feature/feature.tsx")
  })

  it("should name the root package's main module index", () => {
    expect(getMainModulePath("", "utils.ts")).toBe("index.ts")
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

describe("getVisiblePackage", () => {
  it.each([
    {
      description: "a package beside a package that holds the importer",
      from: "app/feature",
      to: "lib/nested",
      visible: "lib",
    },
    {
      description: "a package beside the importer's own",
      from: "app/feature",
      to: "app/other/deep",
      visible: "app/other",
    },
    { description: "a subpackage", from: "app", to: "app/feature/deep", visible: "app/feature" },
    { description: "a package from the root package", from: "", to: "lib/nested", visible: "lib" },
  ])("should reach $description through its outermost visible package", ({ from, to, visible }) => {
    expect(getVisiblePackage(from, to)).toBe(visible)
  })

  it.each([
    ["its own package", "app/feature", "app/feature"],
    ["a package that holds it", "app/feature", "app"],
    ["the root package", "app/feature", ""],
  ])("should return undefined for %s", (_, fromPackagePath, toPackagePath) => {
    expect(getVisiblePackage(fromPackagePath, toPackagePath)).toBeUndefined()
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
