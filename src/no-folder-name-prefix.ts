import { defineRule } from "@oxlint/plugins"

import { getFileNode } from "#file-node.ts"
import { getFileName, getFolderName, getPackagePath } from "#layout.ts"
import { readLintedModule } from "#settings.ts"

/** A module whose name starts with its folder's name, and the path it would have without it. */
interface FolderNamePrefix {
  module: string
  renamed: string
}

/** Returns how a module's name repeats its folder's name, like `imports/imports-map.ts`, or `undefined` when it doesn't. */
export const findFolderNamePrefix = (modulePath: string): FolderNamePrefix | undefined => {
  const folderName = getFolderName(modulePath)
  const fileName = getFileName(modulePath)
  if (folderName === "" || !fileName.startsWith(`${folderName}-`)) return undefined

  return { module: modulePath, renamed: `${getPackagePath(modulePath)}/${fileName.slice(folderName.length + 1)}` }
}

export const noFolderNamePrefix = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Forbid starting a module's name with its folder's name." },
    messages: {
      folderNamePrefix: "'{{module}}' repeats its folder's name. Drop it from the file name: '{{renamed}}'.",
    },
  },
  create: (context) => {
    const lintedModule = readLintedModule(context)
    // Skip test code, because a test takes its module's name, and a fixture can copy any layout on purpose.
    if (lintedModule === undefined || lintedModule.isTestCode) return {}

    const folderNamePrefix = findFolderNamePrefix(lintedModule.modulePath)
    if (folderNamePrefix === undefined) return {}

    return {
      Program: (program) => {
        context.report({ node: getFileNode(program), messageId: "folderNamePrefix", data: { ...folderNamePrefix } })
      },
    }
  },
})
