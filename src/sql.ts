import {Pool} from "pg"
import sqlite from "sqlite3"
import Debug from "debug"
import FilterContext from "./filter_context"

const debug = Debug("vtml:sql")

export
interface NodeSqlInterface {
	query(q:string, vars:unknown[]): Promise<unknown[]>
	queryRow(q:string, vars:unknown[]): Promise<unknown>

	prepare(q:string): (ctx:FilterContext) => Promise<unknown[]>
	isConnected(): boolean
}


function dummyInterface(): NodeSqlInterface {
	return {
		query() {
			throw Error(`query called in dummy`)
		},
		queryRow() {
			throw Error(`queryRow called in dummy`)
		},
		prepare() {
			throw Error(`prepare called in dummy`)
		},
		isConnected(){ return false },
	}
}

function slightlyNicerSql(sql:string) {
	return sql.replace(/\n\s+/g, ' ')
}

type ProcessedSQL = {
	sql: string
	vars: unknown[]
}


function postgresqlInterface(url:URL): NodeSqlInterface {

	const database = url.pathname ? url.pathname.substr(1) : undefined;

	const pgPool = new Pool({
		user: url.username,
		password: url.password,
		host: url.host,
		port: parseInt(url.port),
		database,
	})
	
	function queryPg(sql:string, vars:unknown[]) {
		const nicerSQL = slightlyNicerSql(sql)
		debug(nicerSQL)
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

function sqliteInterface(url:URL): NodeSqlInterface {
	const sqliteDb = new sqlite.Database(url.host)

	function sqliteQuery(sql:string, vars:unknown[]): Promise<unknown[]> {
		return new Promise((resolve, reject) => {
			sqliteDb.all(sql, vars, (err, rows) => {
				if (err) {
					reject(err)
				} else {
					resolve(rows)
				}
			})
		})
	}

	function vtmlToSqliteQuery(sql:string, ctx:FilterContext): ProcessedSQL {
		const vars: unknown[] = []
		const matches = sql.match(FilterContext.TemplateRegex)
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

	return {
		query: sqliteQuery,
		queryRow: (sql:string, vars:unknown[]) => {
			return sqliteQuery(sql, vars).then((rows) => rows[0])
		},
		prepare(q:string) {
			return (ctx:FilterContext) => {
				const {sql, vars} = vtmlToSqliteQuery(q, ctx)
				return sqliteQuery(sql, vars)
			}
		},
		isConnected: () => true,
	}
}

function Initialize(): NodeSqlInterface {
	const DB_URL = process.env.DB_URL

	if (! DB_URL) {
		return dummyInterface()
	}

	const dbUrl = new URL(DB_URL)

	switch (dbUrl.protocol) {
		case "postgres:":
		case "pg:":
		case "postgresql:":
			return postgresqlInterface(dbUrl)
		case "sqlite:":
		case "sqlite3:":
			return sqliteInterface(dbUrl)
		default:
			throw Error(`Unknown db type ${dbUrl.protocol}`)
	}
}

const nodeInterface: NodeSqlInterface = Initialize()
export default nodeInterface
