import { defineRule } from "@oxlint/plugins"

import { getFileNode } from "#file-node.ts"
import { getFileName, getFolderName, getModuleStem, getPackagePath } from "#layout.ts"
import { readLintedModule } from "#settings.ts"

/** A module named after its own folder, and the path it would have beside that folder. */
interface FolderNamedModule {
  module: string
  beside: string
}

/**
 * Returns how a module is named after its own folder, or `undefined` when it isn't. Compares the name up to its first
 * dot, so `bask/bask.base.ts` counts too.
 */
export const findFolderNamedModule = (modulePath: string): FolderNamedModule | undefined => {
  const folderName = getFolderName(modulePath)
  if (folderName === "" || getModuleStem(modulePath) !== folderName) return undefined

  const parentPath = getPackagePath(getPackagePath(modulePath))
  const fileName = getFileName(modulePath)
  return { module: modulePath, beside: parentPath === "" ? fileName : `${parentPath}/${fileName}` }
}

export const noFolderNamedModules = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Forbid naming a module after its own folder." },
    messages: {
      folderNamed:
        "'{{module}}' is named after its folder. Move it beside the folder as '{{beside}}', or rename it for what it holds.",
    },
  },
  create: (context) => {
    const lintedModule = readLintedModule(context)
    // Skip test code, because a test takes its module's name, and a fixture can copy any layout on purpose.
    if (lintedModule === undefined || lintedModule.isTestCode) return {}

    const folderNamedModule = findFolderNamedModule(lintedModule.modulePath)
    if (folderNamedModule === undefined) return {}

    return {
      Program: (program) => {
        context.report({ node: getFileNode(program), messageId: "folderNamed", data: { ...folderNamedModule } })
      },
    }
  },
})
