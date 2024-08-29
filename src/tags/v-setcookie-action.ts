import type { Tag } from "../types"
import { filterPass, stripFilter } from "../tag_utils"
import * as utils from "../utils"

export const XSetcookieAction: Tag = {
	name: "v-setcookie-action",
	render: stripFilter,
	action(el) {
		const name = utils.requireAttribute(el, "name")
		const value = utils.requireAttribute(el, "value")

		const seconds = utils.optNumAttribute(el, "max-seconds") || 0
		const minutes = utils.optNumAttribute(el, "max-minutes") || 0
		const hours = utils.optNumAttribute(el, "max-hours") || 0
		const days = utils.optNumAttribute(el, "max-days") || 0

		const maxAge = (seconds * 1000) + (minutes * 60000) + (hours * 60000 * 60) + (days * 60000 * 60 * 24)

		return async (ctx) => {
			const realName = ctx.templateStringSafe(name)
			const realValue = ctx.templateStringSafe(value)
			ctx = ctx.SetCookie(realName, realValue, maxAge)
			return filterPass(ctx)
		}
	},
}
