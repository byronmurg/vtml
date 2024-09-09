import CreateLoaderTag from "./loader"
import * as SQL from "../sql"

export 
const VSQL = CreateLoaderTag({
	name: "v-sql",

	attributes: {
		"target": { target:true },
		"single-row": {},
	},

	prepareChain(block) {
		const query = block.requireOneTextChild()
		const target = block.targetAttr()
		const single = block.boolAttr("single-row")

		return async (ctx) => {
			const results = await SQL.query(query, ctx)
			const output = single ? results[0] : results
			return target ? ctx.SetVar(target, output) : ctx
		}
	}
})
