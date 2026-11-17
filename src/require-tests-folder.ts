import { defineRule } from "@oxlint/plugins"

import { getFileNode } from "#file-node.ts"
import { isTestFile } from "#layout.ts"
import { readLintedModule } from "#settings.ts"

export const requireTestsFolder = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Require each test file to sit in a tests folder." },
    messages: {
      testOutsideTestsFolder:
        "'{{module}}' is a test outside a '{{testsFolder}}' folder. Move it into the '{{testsFolder}}' folder beside the module it tests.",
    },
  },
  create: (context) => {
    const lintedModule = readLintedModule(context)
    if (lintedModule === undefined) return {}

    const { modulePath, testsFolder } = lintedModule
    if (!isTestFile(modulePath) || lintedModule.isInTestsFolder) return {}

    return {
      Program: (program) => {
        context.report({
          node: getFileNode(program),
          messageId: "testOutsideTestsFolder",
          data: { module: modulePath, testsFolder },
        })
      },
    }
  },
})
