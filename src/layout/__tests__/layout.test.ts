import { describe, expect, it } from "bun:test"
import path from "node:path"

import { getBranch, getPackagePath, holdsPackage, toModulePath } from "#layout/layout.ts"

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
