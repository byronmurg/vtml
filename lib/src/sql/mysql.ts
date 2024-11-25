import mysql from "mysql2/promise"
import {debug, slightlyNicerSql, vtmlToQuestionMarkAnchorQuery} from "./common"
import {URL} from "url"
import type {ProcessedSQL} from "./common"
import type NodeSqlInterface from "./interface"
import type FilterContext from "../filter_context"

export default
function mysqlInterface(url:URL): NodeSqlInterface {
	const pool = mysql.createPool(url.href)

	async function queryBase(sql:string, vars:unknown[]) {
		const connection = await pool.getConnection()
		try {
			sql = slightlyNicerSql(sql)
			debug(sql, vars)
			const [results] = await connection.query(sql, vars)
			return results as unknown[]
		} finally {
			connection.release()
		}
	}

	function vtmlToMysqlQuery(sql:string, ctx:FilterContext): ProcessedSQL {
		return vtmlToQuestionMarkAnchorQuery(sql, ctx)
	}

	return {
		query: queryBase,

		queryRow: async (sql:string, vars:unknown[]) => {
			const rows = await queryBase(sql, vars)
			return rows[0]
		},

		prepare(sql:string) {
			return (ctx:FilterContext) => {
				const mysqlQ = vtmlToMysqlQuery(sql, ctx)
				return queryBase(mysqlQ.sql, mysqlQ.vars)
			}
		},

		isConnected() {
			return true
		}
	}
	
}


