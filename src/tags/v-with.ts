import type { Tag } from "../types"
import { filterPass } from "../tag_utils"
import * as utils from "../utils"

export const XWithTag: Tag = {
	name: "v-with",
	render(el, cascade) {
		const source = utils.getSource(el)
		const content = cascade.childs(el.elements)
		return async (ctx) => {
			const sub = ctx.Select(source)
			if (!sub.dataset) {
				return filterPass(ctx)
			} else {
				const s = await content(sub)
				return { ctx, elements: s.elements }
			}
		}
	},
	loaderContains(el) {
		const source = utils.getSource(el)

		return (ctx) => {
			ctx = ctx.Select(source)
			const found = !!ctx.dataset
			return { ctx, found }
		}
	},
	actionContains(el) {
		const source = utils.getSource(el)

		return (ctx) => {
			ctx = ctx.Select(source)
			const found = !!ctx.dataset
			return { ctx, found }
		}
	},
}
