import type FilterContext from "../filter_context"

export default
interface NodeSqlInterface {
	query(q:string, vars:unknown[]): Promise<unknown[]>
	queryRow(q:string, vars:unknown[]): Promise<unknown>

	prepare(q:string): (ctx:FilterContext) => Promise<unknown[]>
	isConnected(): boolean
}

