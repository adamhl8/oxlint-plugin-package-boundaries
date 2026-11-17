import { describe, expect, it } from "bun:test"

import plugin from "#index.ts"

describe("plugin", () => {
  it("should expose its rule under the package-boundaries name", () => {
    expect([plugin.meta?.name, Object.keys(plugin.rules)]).toStrictEqual(["package-boundaries", ["no-upward-imports"]])
  })
})
