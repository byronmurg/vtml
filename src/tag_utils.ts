import type FilterContext from "./filter_context"
import type { Element } from "./html"
import type {Branch, TagFilter} from "./types"
import {filterHTML} from "./filter"

// Tag utilities
export function filterPass(ctx:FilterContext, ...elements:Element[]): Branch {
	return {elements, ctx}
}

export const stripFilter = () => async (ctx:FilterContext) => filterPass(ctx)
export const justReturnFilter = filterHTML
export const passthroughFilter: TagFilter = (el, cascade) => cascade.childs(el.elements)

