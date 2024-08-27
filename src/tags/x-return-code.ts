import type { Tag } from "../types"
import { filterPass, stripFilter } from "../tag_utils"
import * as utils from "../utils"
import Debug from "debug"

const debug = Debug("startling:tags:x-return-code")

export const XReturnCode: Tag = {
	name: "x-return-code",

	actionPreceeds(el) {
		const code = utils.requireNumAttribute(el, "code")
		return async (ctx) => ctx.SetReturnCode(code)
	},

	render(el) {
		const code = utils.requireNumAttribute(el, "code")
		return async (ctx) => {
			debug("setting return code", code)
			ctx = ctx.SetReturnCode(code)
			return filterPass(ctx)
		}
	},
}

export const XReturnCodeAction: Tag = {
	name: "x-return-code-action",
	render: stripFilter,
	action(el) {
		const code = utils.requireNumAttribute(el, "code")
		return async (ctx) => {
			debug("setting return code", code)
			ctx = ctx.SetReturnCode(code)
			return filterPass(ctx)
		}
	},
}
