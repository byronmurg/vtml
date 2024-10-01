import { Database as SQLiteDatabase } from "bun:sqlite"
import type FilterContext from "../filter_context"
import {URL} from "url"
import {debug, slightlyNicerSql, vtmlToQuestionMarkAnchorQuery} from "./common"
import type {ProcessedSQL} from "./common"
import type NodeSqlInterface from "./interface"

export default
function sqliteInterface(url:URL): NodeSqlInterface {
	debug("SQLITE connect", url.host)
	const sqliteDb = new SQLiteDatabase(url.host)

	async function sqliteQuery(sql:string, vars:unknown[]): Promise<unknown[]> {
		sql = slightlyNicerSql(sql)
		debug(sql)
		const query = sqliteDb.query(sql)
		// @NOTE TS doesn't like this line as it's bun specific
		// it is okay though.
		return await query.all(vars as unknown as string)
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

