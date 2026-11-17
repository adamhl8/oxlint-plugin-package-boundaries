import { defineRule } from "@oxlint/plugins"

import { visitImports } from "#imports.ts"
import { isIndexModule, toModulePath } from "#layout.ts"
import { readLintedModule } from "#settings.ts"

export const noIndexImports = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Forbid importing an index file, which is an entry point." },
    messages: {
      indexImport: "'{{module}}' is an entry point. Import from the module that declares what you need.",
    },
  },
  create: (context) => {
    const lintedModule = readLintedModule(context)
    // Skip test code, because a test may import the entry point to check the public API.
    if (lintedModule === undefined || lintedModule.isTestCode) return {}

    // Check type-only imports too, because a type imported through an entry point still hides where it's declared.
    return visitImports(context.filename, ({ node, importPath }) => {
      const importedModule = toModulePath(lintedModule.rootDirectory, importPath)
      if (importedModule !== undefined && isIndexModule(importedModule))
        context.report({ node, messageId: "indexImport", data: { module: importedModule } })
    })
  },
})
