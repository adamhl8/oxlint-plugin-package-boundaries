import { oxlintConfig } from "@adamhl8/configs"
import { defineConfig } from "oxlint"

const config = oxlintConfig({
  ignorePatterns: ["src/**/fixtures/**"],
})

export default defineConfig(config)
