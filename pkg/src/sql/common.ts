import Debug from "debug"
import type FilterContext from "../filter_context"
import * as Vars from "../variables"

export
const debug = Debug("vtml:sql")

export
type ProcessedSQL = {
	sql: string
	vars: unknown[]
}

export
function vtmlToQuestionMarkAnchorQuery(sql:string, ctx:FilterContext): ProcessedSQL {
	const vars: unknown[] = []
	const {all:matches} = Vars.basicTemplate.findAllVars(sql)
	if (! matches) {
		return {sql, vars}
	}

	for (let i = 0; i < matches.length; i++) {
		const match = matches[i]
		const value = ctx.getKey(match)
		vars.push(value)

		sql = sql.replace(match, `?`)
	}

	return {sql, vars}
}

export
function slightlyNicerSql(sql:string) {
	return sql.replace(/\n\s+/g, ' ')
}

