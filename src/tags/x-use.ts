import type { Tag } from "../types"
import * as utils from "../utils"

export const XUseTag: Tag = {
	name: "x-use",
	render(el, cascade) {
		const source = utils.requireSourceAttribute(el)
		const content = cascade.childs(el.elements)
		return async (ctx) => {
			const sub = ctx.Select(source)
			const s = await content(sub)
			return { ctx, elements: s.elements }
		}
	},
}
