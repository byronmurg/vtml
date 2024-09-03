import type { Tag } from "../types"
import {filterPass } from "../tag_utils"
import Debug from "debug"

const debug = Debug("vtml:tags:v-catch")

export const XCatch:Tag = {
	name: "v-catch",
	render(el, cascade) {
		const childs = cascade.childs(el.elements)

		return async (ctx) => {
			if (ctx.InError()) {
				debug("render")
				return childs(ctx)
			} else {
				debug("pass")
				return filterPass(ctx)
			}
		}
	},
}
