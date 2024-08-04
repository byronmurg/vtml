import type { Tag } from "../types"
import { filterPass, stripFilter } from "../tag_utils"
import * as utils from "../utils"

export const XSetcookieAction: Tag = {
	name: "x-setcookie-action",
	render: stripFilter,
	action(el) {
		const name = utils.requireAttribute(el, "name")
		const value = utils.requireAttribute(el, "value")

		return async (ctx) => {
			ctx = ctx.SetCookie(name, value)
			return filterPass(ctx)
		}
	},
}
