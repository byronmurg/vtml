import type { Tag } from "../types"
import {filterPass } from "../tag_utils"
import Debug from "debug"

const tryDebug = Debug("starling:tags:x-try")
const catchDebug = Debug("starling:tags:x-catch")

export const XTry:Tag = {
	name: "x-try",
	render(el, cascade) {
		const childs = cascade.childs(el.elements)

		return async (ctx) => {
			if (! ctx.InError()) {
				tryDebug("render")
				return childs(ctx)
			} else {
				tryDebug("pass")
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
				catchDebug("render")
				return childs(ctx)
			} else {
				catchDebug("pass")
				return filterPass(ctx)
			}
		}
	}
}
