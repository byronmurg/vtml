import type { Tag, Branch } from "../types"
import {filterElementArray} from "../filter"

export const VAsync: Tag = {
	name: "v-async",
	render(el, cascade) {
		const subElements = filterElementArray(el.elements, cascade)

		return async (ctx): Promise<Branch> => {
			const childBranches = await Promise.all(subElements.map((child) => child(ctx)))
			const elements = childBranches.flatMap((branch) => branch.elements)
			return { ctx, elements }
		}
	},
}
