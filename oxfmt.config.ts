import { oxfmtConfig } from "@adamhl8/configs"
import { defineConfig } from "oxfmt"

// Fixture files have exact contents the tests depend on; don't reformat them.
const config = oxfmtConfig({ ignorePatterns: ["src/**/fixtures/**"] })

export default defineConfig(config)
