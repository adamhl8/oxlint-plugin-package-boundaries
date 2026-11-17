import type { ESTree } from "@oxlint/plugins"

/**
 * Returns the node a report about the whole file goes on: its first statement, or the program for an empty file. Report
 * on the first statement, because a report at the file's first character comes before any comment that could suppress
 * it.
 */
export const getFileNode = (program: ESTree.Program): ESTree.Node => program.body[0] ?? program
