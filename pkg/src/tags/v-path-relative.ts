import CreateLoaderTag from "./loader"

export 
const VPathRelative = CreateLoaderTag({
	name: "v-path-relative",

	attributes: {
		"path": { relative:true, required:true },
		"target": { target:true, required:true },
	},
	bodyPolicy: "deny",

	prepareChain(block) {
		const target = block.targetAttr()
		return async (ctx) => {
			const {path} = block.templateAttributes(ctx)
			return ctx.SetVar(target, path)
		}
	}
})
