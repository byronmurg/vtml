import CreateLoaderTag from "./loader"
import SQL from "../sql"

export 
const VSQL = CreateLoaderTag({
	name: "v-sql",

	attributes: {
		"target": { target:true },
		"single-row": {},
	},

	prepareChain(block) {

		if (!SQL.isConnected()) {
			block.error(`v-sql used but no DB_URL environment variable was found`)
		}

		const sql = block.requireOneTextChild()
		const target = block.targetAttr()
		const single = block.boolAttr("single-row")
		const query = SQL.prepare(sql)

		return async (ctx) => {
			const results = await query(ctx)
			const output = single ? results[0] : results
			return target ? ctx.SetVar(target, output) : ctx
		}
	}
})
