import {URL} from "url"
import type NodeSqlInterface from "./interface"
import dummyInterface from "./dummy"
import mysqlInterface from "./mysql"
import postgresqlInterface from "./postgresql"
import sqliteInterface from "./sqlite"

function Initialize(): NodeSqlInterface {
	const DB_URL = process.env['DB_URL']

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
		case "mysql:":
			return mysqlInterface(dbUrl)
		default:
			throw Error(`Unknown db type ${dbUrl.protocol}`)
	}
}

const nodeInterface: NodeSqlInterface = Initialize()
export default nodeInterface
