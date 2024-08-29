import type FilterContext from "./filter_context"
import type { Element } from "./html"
import type {Branch, TagFilter, ChainPreceeds} from "./types"
import * as utils from "./utils"
import {filterHTML} from "./filter"

// Tag utilities
export function filterPass(ctx:FilterContext, ...elements:Element[]): Branch {
	return {elements, ctx}
}

export const stripFilter = () => async (ctx:FilterContext) => filterPass(ctx)
export const justReturnFilter = filterHTML
export const passthroughFilter: TagFilter = (el, cascade) => cascade.childs(el.elements)

export const loaderOnlyFilter = (def:TagFilter): TagFilter => {
	/*
	 * When inside an Action only call this loader if
	 * the loader-only flag has not been set.
	 */

	return function(el, cascade) {
		const loaderOnly = utils.getBoolAttribute(el, "loader-only")

		if (loaderOnly) {
			return async (ctx) => filterPass(ctx)
		} else {
			return def(el, cascade)
		}
	}
}

export const loaderOnlyPreceeds = (def:ChainPreceeds): ChainPreceeds => {
	/*
	 * When preceeding an Action only call this ActionPreceeds if
	 * the loader-only flag has not been set.
	 */

	return function(el) {
		const loaderOnly = utils.getBoolAttribute(el, "loader-only")

		if (loaderOnly) {
			return async (ctx:FilterContext) => ctx
		} else {
			return def(el)
		}
	}
}
