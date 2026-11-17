import { feature } from "#app/app.ts"
import type { Feature } from "#app/app.ts"
import { helper } from "#app/helper.ts"
import { usesApp } from "#uses-app.ts"
import { shout } from "#utils.ts"

export const part: Feature[] = [String(feature), String(helper), String(usesApp), shout("a")]
