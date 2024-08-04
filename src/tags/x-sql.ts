import type { Tag } from "../types"
import { filterPass, stripFilter } from "../tag_utils"
import * as utils from "../utils"
import type FilterContext from "../filter_context"

export const XSQL: Tag = {
	name: "x-sql",
	render(el) {
		const query = utils.requireOneTextChild(el)
		const targetAttr = utils.requireTargetAttribute(el)
		const single = utils.getBoolAttribute(el, "single-row")

		return async (ctx) => {
			const nextCtx = await ctx.AddSQLDatasource(query, targetAttr, single)
			return filterPass(nextCtx)
		}
	},

	actionPreceeds(el) {
		const query = utils.requireOneTextChild(el)
		const targetAttr = utils.requireTargetAttribute(el)
		const single = utils.getBoolAttribute(el, "single-row")

		return (ctx) => {
			return ctx.AddSQLDatasource(query, targetAttr, single)
		}
	},
}

export const XSQLAction: Tag = {
	name: "x-sql-action",
	render: stripFilter,

	action: (formAction) => {
		const query = utils.requireOneTextChild(formAction)
		const target = utils.getAttribute(formAction, "target")
		const single = utils.getBoolAttribute(formAction, "single-row")
		return async (ctx: FilterContext) => {
			const results = await ctx.RunSQL(query)
			const output = single ? results[0] : results
			ctx = target ? ctx.SetVar(target, output) : ctx
			return filterPass(ctx)
		}
	},
}
