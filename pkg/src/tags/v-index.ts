import CreateDisplayTag from "./display"

export
const VIndex = CreateDisplayTag({
	name: "v-index",
	attributes: {},
	bodyPolicy: "require",

	prepareRender(block) {
		return async (ctx) => {
			const matchedPath = ctx.getKey("$.matchedPath")
			const matchedPage = ctx.getKey("$__matchedPage")

			if (matchedPage === matchedPath) {
				return block.renderChildren(ctx)
			} else {
				return ctx.filterPass()
			}
		}
	}
})
