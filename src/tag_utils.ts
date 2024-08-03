import type FilterContext from "./filter_context"
import type { Element } from "./html"
import type {Branch} from "./types"
import {filterHTML} from "./filter"

// Tag utilities
export function filterPass(ctx:FilterContext, ...elements:Element[]): Branch {
	return {elements, ctx}
}

export const stripFilter = () => async (ctx:FilterContext) => filterPass(ctx)
export const justReturnFilter = filterHTML


export function prefixIfNotAlready(str:string, prefix:string): string {
	return str.startsWith(prefix)? str : prefix.concat(str)
}
