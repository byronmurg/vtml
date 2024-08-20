import type { Tag } from "../types"
import {filterPass } from "../tag_utils"

export const XTry:Tag = {
	name: "x-try",
	render(el, cascade) {
		const childs = cascade.childs(el.elements)

		return async (ctx) => {
			if (! ctx.InError()) {
				return childs(ctx)
			} else {
				return filterPass(ctx)
			}
		}
	}
}

export const XCatch:Tag = {
	name: "x-catch",
	render(el, cascade) {
		const childs = cascade.childs(el.elements)

		return async (ctx) => {
			if (ctx.InError()) {
				return childs(ctx)
			} else {
				return filterPass(ctx)
			}
		}
	}
}
