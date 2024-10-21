import CreateLoaderTag from "./loader"
import * as utils from "../utils"

export
const VOutput = CreateLoaderTag({
	name: "v-output",
	attributes: {
		source: { required:true, source:true },
	},
	bodyPolicy: "requireTextOnly",

	prepareChain(block) {
		const parentAction = block.findAncestor(utils.byName("v-action"))
		if (! parentAction) {
			throw Error(`Must appear inside a v-action`)
		}

		const source = block.sourceAttr()
		return async (ctx) => {
			if (ctx.rootDataset.action) {
				const output = ctx.getKey(source)
				ctx.SetApiOutput(output)
			}

			return ctx
		}
	}
})

