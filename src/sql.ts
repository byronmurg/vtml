import {Pool} from "pg"
import Debug from "debug"
import FilterContext from "./filter_context"

const debug = Debug("starling:sql")

const db = new Pool()

const dbQuery = (sql:string, vars:unknown[]) => {
	debug("sql", sql, vars)
	return db.query(sql, vars)
}

type ProcessedSQL = {
	sql: string
	vars: unknown[]
}

function processSQL(sql:string, ctx:FilterContext): ProcessedSQL {
	const vars: unknown[] = []
	const matches = sql.match(FilterContext.TemplateRegex)
	if (! matches) {
		return {sql, vars}
	}

	for (let i = 0; i < matches.length; i++) {
		const match = matches[i]
		const value = ctx.getKey(match)
		vars.push(value)

		sql = sql.replace(match, `$${i+1}`)
	}

	return {sql, vars}
}

export
async function query(q:string, ctx:FilterContext) {
	const {sql, vars} = processSQL(q, ctx)
	const {rows} = await dbQuery(sql, vars)
	return rows
}

function fromNodeQuery(q:string): string {
	let i = 1
	return q.replace(/\?/g, () => `$${i++}`)
}

async function nodeQuery(nodeQuery:string, vars:unknown[]){
	const q = fromNodeQuery(nodeQuery)
	return dbQuery(q, vars)
}
async function nodeQueryRow(q:string, vars:unknown[]) {
	const {rows} = await nodeQuery(q, vars)
	return rows[0]
}


export const nodeInterface = {
	query: nodeQuery,
	queryRow: nodeQueryRow,
}
