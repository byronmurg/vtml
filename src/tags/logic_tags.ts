import type FilterContext from "../filter_context"
import type { Tag } from "../types"
import * as utils from "../utils"
import type {TagElement} from "../html"

import { filterPass } from "../tag_utils"
import doesLogicSelectorMatch from "../logic"

function elementCheck(el:TagElement) {
	const attributes = utils.getAllAttributes(el)
	const source = utils.getSource(el)

	return (ctx:FilterContext) => {
		const subCtx = ctx.Select(source)
		return doesLogicSelectorMatch(subCtx.dataset, attributes)
	}
}


export const XIf: Tag = {
	name: "x-if",
	render(el, cascade) {
		const check = elementCheck(el)
		const childs = cascade.childs(el.elements)

		return async (ctx) => {
			const doesMatch = check(ctx)

			if (doesMatch) {
				return await childs(ctx)
			} else {
				return filterPass(ctx)
			}
		}
	},

	loaderContains(el) {
		const check = elementCheck(el)

		return (ctx) => {
			const found = check(ctx)
			return { ctx, found }
		}
	},

	actionContains(el) {
		const check = elementCheck(el)

		return (ctx) => {
			const found = check(ctx)
			return { ctx, found }
		}
	},
}


export const XUnless: Tag = {
	name: "x-unless",
	render(el, cascade) {
		const check = elementCheck(el)
		const childs = cascade.childs(el.elements)

		return async (ctx) => {
			const doesMatch = check(ctx)

			if (!doesMatch) {
				return await childs(ctx)
			} else {
				return filterPass(ctx)
			}
		}
	},

	loaderContains(el) {
		const check = elementCheck(el)

		return (ctx) => {
			const found = !check(ctx)
			return { ctx, found }
		}
	},
	actionContains(el) {
		const check = elementCheck(el)

		return (ctx) => {
			const found = !check(ctx)
			return { ctx, found }
		}
	}
}
