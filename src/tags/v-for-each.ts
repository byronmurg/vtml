import type {VtmlTag} from "../types"

export const VForEach: VtmlTag = {
	name: "v-for-each",
	attributes: {
		source: { required:true, source:true },
		as: { required:true, inject:true },
		keyas: { inject:true },
	},

	isLoop: true,

	prepare: (branch) => {

		const source = branch.sourceAttr()
		const asAttr = branch.attr("as")
		const keyAsAttr = branch.attr("keyas")

		return {
			preceeds: (ctx) => Promise.resolve(ctx),
			// Always found!!!
			contains: (ctx) => Promise.resolve({ ctx, found:true }),

			async render(ctx) {
				
				const value = ctx.getKey(source)

				if (Array.isArray(value)) {
					// render children for each element of array
					const promises = value.map((sub, i) => {
						const subCtx = ctx.SetVar(asAttr, sub)
							.SetVar(keyAsAttr, i)
						return branch.renderChildren(subCtx)
					})

					// Await all branches
					const branches = await Promise.all(promises)

					// Join up the elements
					const elements = branches.flatMap((branch) => branch.elements)

					return {ctx, elements}

				} else if (value?.constructor === Object) {
					// convert the object into entries
					const entries = Object.entries(value)

					// render each entry seperately
					const promises = entries.map(([key, value]) => {
						const subCtx = ctx.SetVar(asAttr, value)
							.SetVar(keyAsAttr, key)
						return branch.renderChildren(subCtx)
					})

					// Await all branches
					const branches = await Promise.all(promises)

					// Join up the elements
					const elements = branches.flatMap((branch) => branch.elements)

					return {ctx, elements}
				} else {
					return ctx.filterPass()
				}
			}
		}
	},
}


