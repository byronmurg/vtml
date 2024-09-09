import CreateLoaderTag from "./loader"
import NodeFunction from "../node"

export
const VNodeJs = CreateLoaderTag({
	name: "v-nodejs",

	attributes: {
		"target": { target:true },
	},

	prepareChain(block) {
		const body = block.requireOneTextChild()
		const targetAttr = block.targetAttr()
		const fnc = NodeFunction(body, block.getName())

		return async (ctx) => {
			const output = await fnc(ctx)
			return ctx.SetVar(targetAttr, output)
		}
	}
})

