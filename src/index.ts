import { definePlugin } from "@oxlint/plugins"

import { noFolderNamePrefix } from "#no-folder-name-prefix.ts"
import { noFolderNamedModules } from "#no-folder-named-modules.ts"
import { noIndexImports } from "#no-index-imports.ts"
import { noMutualImports } from "#no-mutual-imports.ts"
import { noUpwardImports } from "#no-upward-imports.ts"
import { requireTestsFolder } from "#require-tests-folder.ts"

const plugin = definePlugin({
  // Name the rule prefix users type in config, like `package-boundaries/no-upward-imports`.
  meta: { name: "package-boundaries" },
  rules: {
    "no-upward-imports": noUpwardImports,
    "no-mutual-imports": noMutualImports,
    "no-index-imports": noIndexImports,
    "no-folder-named-modules": noFolderNamedModules,
    "no-folder-name-prefix": noFolderNamePrefix,
    "require-tests-folder": requireTestsFolder,
  },
})

// oxlint-disable-next-line import/no-default-export - oxlint loads a plugin from its default export
export default plugin
