import {Pool} from "pg"
import * as Vars from "../variables"
import type FilterContext from "../filter_context"
import {URL} from "url"
import {debug, slightlyNicerSql} from "./common"
import type {ProcessedSQL} from "./common"
import type NodeSqlInterface from "./interface"

export default
function postgresqlInterface(url:URL): NodeSqlInterface {

	const pgPool = new Pool({
		connectionString: url.href,
	})
	
	function queryPg(sql:string, vars:unknown[]) {
		const nicerSQL = slightlyNicerSql(sql)
		debug(nicerSQL, vars)
		return pgPool.query(nicerSQL, vars)
			.then((res) => res.rows)
	}

	function qMarksToPgQuery(q:string): string {
		let i = 1
		return q.replace(/\?/g, () => `$${i++}`)
	}

	function queryQMarks(sql:string, vars:unknown[]) {
		const pgStyleQuery = qMarksToPgQuery(sql)
		return queryPg(pgStyleQuery, vars)
	}

	function vtmlToPgQuery(sql:string, ctx:FilterContext): ProcessedSQL {
		const vars: unknown[] = []
		const {all:matches} = Vars.basicTemplate.findAllVars(sql)
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

	return {
		query: queryQMarks,

		queryRow: async (sql:string, vars:unknown[]) => {
			const rows = await queryQMarks(sql, vars)
			return rows[0]
		},

		prepare(sql:string) {
			// @TODO actually prepare this properly
			return (ctx:FilterContext) => {
				const pgQ = vtmlToPgQuery(sql, ctx)
				return queryPg(pgQ.sql, pgQ.vars)
			}
		},

		isConnected() {
			return true
		}
	}
}

