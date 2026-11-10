import { definePlugin } from "@oxlint/plugins"

import { noDeepImports } from "#no-deep-imports.ts"
import { noUpwardImports } from "#no-upward-imports.ts"

const plugin = definePlugin({
  // Name the rule prefix users type in config, like `package-boundaries/no-deep-imports`.
  meta: { name: "package-boundaries" },
  rules: {
    "no-deep-imports": noDeepImports,
    "no-upward-imports": noUpwardImports,
  },
})

// oxlint-disable-next-line import/no-default-export - oxlint loads a plugin from its default export
export default plugin
