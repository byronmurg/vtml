import type { Tag, Branch } from "../types"
import type { Element } from "../html"
import { filterPass } from "../tag_utils"
import * as utils from "../utils"

export const XJson: Tag = {
	name: "x-json",
	render(el: Element) {
		const json = utils.bodyOrSrc(el)
		const targetAttr = utils.requireTargetAttribute(el)
		const jsonData = JSON.parse(json)

		return async (ctx): Promise<Branch> => {
			const nextCtx = ctx.SetVar(targetAttr, jsonData)
			return filterPass(nextCtx)
		}
	},
}
