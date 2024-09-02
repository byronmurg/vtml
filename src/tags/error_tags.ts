import type { Tag } from "../types"
import {filterPass } from "../tag_utils"
import Debug from "debug"

const tryDebug = Debug("vtml:tags:v-try")
const catchDebug = Debug("vtml:tags:v-catch")

export const XTry:Tag = {
	name: "v-try",
	render(el, cascade) {
		const childs = cascade.childs(el.elements)

		return async (ctx) => {
			if (! ctx.InError()) {
				tryDebug("render")
				const output = await childs(ctx)
				if (output.ctx.InThrow()) {
					output.ctx.UnsetThrow()
				}
				return output
			} else {
				tryDebug("pass")
				return filterPass(ctx)
			}
		}
	}
}

export const XCatch:Tag = {
	name: "v-catch",
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
