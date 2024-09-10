import CreateLoaderTag from "./loader"

export 
const VRedirect = CreateLoaderTag({
	name: "v-redirect",

	attributes: {
		"path": { required:true },
	},

	prepareChain(block) {
		return async (ctx) => {
			const {path} = block.templateAttributes(ctx)

			return ctx.SetRedirect(path.toString())
		}
	}
})
