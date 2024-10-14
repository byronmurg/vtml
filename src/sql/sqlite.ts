import { Database as SQLiteDatabase } from "sqlite3"
import type FilterContext from "../filter_context"
import * as fs from "node:fs"
import {URL} from "url"
import {debug, slightlyNicerSql, vtmlToQuestionMarkAnchorQuery} from "./common"
import type {ProcessedSQL} from "./common"
import type NodeSqlInterface from "./interface"

export default
function sqliteInterface(url:URL): NodeSqlInterface {
	const path = url.hostname + url.pathname
	debug("SQLITE connect", path)

	try {
		fs.accessSync(path, fs.constants.R_OK)
	} catch (e) {
		const message = e instanceof Error ? e.message : "unknown error"
		throw Error(`Error connecting to sqlite ${url.host}: ${message}`)
	}

	const sqliteDb = new SQLiteDatabase(path)

	function sqliteQuery(sql:string, vars:unknown[]): Promise<unknown[]> {
		sql = slightlyNicerSql(sql)
		debug(sql)
		const query = sqliteDb.prepare(sql)
		return new Promise((resolve, reject) => query.all(vars, (err, rows) => {
			if (err) reject(err)
			else resolve(rows)
		}))
	}

	function vtmlToSqliteQuery(sql:string, ctx:FilterContext): ProcessedSQL {
		return vtmlToQuestionMarkAnchorQuery(sql, ctx)
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

