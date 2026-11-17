import { describe, expect, it } from "bun:test"

import { findFolderNamePrefix } from "#no-folder-name-prefix.ts"

describe("findFolderNamePrefix", () => {
  it.each([
    { modulePath: "imports/imports-map.ts", renamed: "imports/map.ts" },
    { modulePath: "app/settings/settings-db.ts", renamed: "app/settings/db.ts" },
  ])("should find $modulePath, and drop the folder's name", ({ modulePath, renamed }) => {
    expect(findFolderNamePrefix(modulePath)).toStrictEqual({ module: modulePath, renamed })
  })

  it.each([
    "imports-map.ts",
    "imports/map.ts",
    "imports/importsmap.ts",
    "dir/host-dir-details.ts",
    "imports/imports.ts",
  ])("should allow %s", (modulePath) => {
    expect(findFolderNamePrefix(modulePath)).toBeUndefined()
  })
})
