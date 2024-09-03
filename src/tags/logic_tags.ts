import type FilterContext from "../filter_context"
import type { Tag } from "../types"
import * as utils from "../utils"
import type {TagElement} from "../html"
import templateAttributes from "../attributes"
import Debug from "debug"

import { filterPass } from "../tag_utils"
import doesLogicSelectorMatch from "../logic"

const debug = Debug("vtml:logic_tags")

function elementCheck(el:TagElement) {
	const source = utils.getSource(el)

	return (ctx:FilterContext) => {
		const attributes = templateAttributes(el.attributes, ctx)
		const subCtx = ctx.Select(source)
		const match = doesLogicSelectorMatch(subCtx.dataset, attributes)
		debug(el.name, match, attributes)
		return match
	}
}


export const XIf: Tag = {
	name: "v-if",
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

	action(el, cascade) {
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
	name: "v-unless",
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

	action(el, cascade) {
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
