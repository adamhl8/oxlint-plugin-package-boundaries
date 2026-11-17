import { describe, expect, it } from "bun:test"

import { findFolderNamedModule } from "#no-folder-named-modules.ts"

describe("findFolderNamedModule", () => {
  it.each([
    { modulePath: "shell/shell.ts", beside: "shell.ts" },
    { modulePath: "test-utils/shell/shell.ts", beside: "test-utils/shell.ts" },
    { modulePath: "bask/bask.base.ts", beside: "bask.base.ts" },
  ])("should find $modulePath, and move it beside its folder", ({ modulePath, beside }) => {
    expect(findFolderNamedModule(modulePath)).toStrictEqual({ module: modulePath, beside })
  })

  it.each(["shell.ts", "shell/run.ts", "shell/shell-run.ts", "shells/shell.ts"])("should allow %s", (modulePath) => {
    expect(findFolderNamedModule(modulePath)).toBeUndefined()
  })
})
