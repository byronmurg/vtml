import type { Tag } from "../types"
import type {TagElement} from "../html"
import { filterPass, stripFilter, loaderOnlyPreceeds, loaderOnlyFilter } from "../tag_utils"
import * as utils from "../utils"
import type FilterContext from "../filter_context"
import * as SQL from "../sql"

function runSQL(el:TagElement) {
	const query = utils.requireOneTextChild(el)
	const target = utils.getAttribute(el, "target")
	const single = utils.getBoolAttribute(el, "single-row")

	return async (ctx:FilterContext) => {
		const results = await SQL.query(query, ctx)
		const output = single ? results[0] : results
		return target ? ctx.SetVar(target, output) : ctx
	}
}

function passSQL(el:TagElement) {
	const run = runSQL(el)
	return (ctx:FilterContext) => run(ctx).then(filterPass)
}


export const XSQL: Tag = {
	name: "v-sql",
	render: passSQL,

	loaderPreceeds: runSQL,

	action: loaderOnlyFilter(passSQL),
	actionPreceeds: loaderOnlyPreceeds(runSQL),
}

export const XSQLAction: Tag = {
	name: "v-sql-action",
	render: stripFilter,
	action: passSQL,
}
