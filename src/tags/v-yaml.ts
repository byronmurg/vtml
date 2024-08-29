import type { Tag, Branch } from "../types"
import { filterPass } from "../tag_utils"
import * as utils from "../utils"
import YAML from "yaml"
import { readFileSync } from "fs"

export const XYaml: Tag = {
	name: "v-yaml",
	render(el) {
		const yamlSrc = utils.requireAttribute(el, "src")
		const yaml = readFileSync(yamlSrc, "utf8")
		const targetAttr = utils.requireTargetAttribute(el)
		const yamlData = YAML.parse(yaml)

		return async (ctx): Promise<Branch> => {
			const nextCtx = ctx.SetVar(targetAttr, yamlData)
			return filterPass(nextCtx)
		}
	},
}
