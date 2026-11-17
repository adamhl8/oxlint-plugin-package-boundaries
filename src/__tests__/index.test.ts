import { describe, expect, it } from "bun:test"

import plugin from "#index.ts"

describe("plugin", () => {
  it("should expose its rules under the package-boundaries name", () => {
    expect([plugin.meta?.name, Object.keys(plugin.rules)]).toStrictEqual([
      "package-boundaries",
      [
        "no-upward-imports",
        "no-mutual-imports",
        "no-index-imports",
        "no-folder-named-modules",
        "no-folder-name-prefix",
        "require-tests-folder",
      ],
    ])
  })
})
