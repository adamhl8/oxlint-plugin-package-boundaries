import path from "node:path"

/** The fixture project the tests lint: a `package.json` with `#*` imports, and its root package in `src/`. */
export const PROJECT_DIRECTORY = path.join(import.meta.dir, "fixtures", "project")

export const ROOT_DIRECTORY = path.join(PROJECT_DIRECTORY, "src")

/** Returns the absolute path of a module in the fixture's root package, from its path relative to `src/`. */
export const toFixturePath = (modulePath: string): string => path.join(ROOT_DIRECTORY, modulePath)
