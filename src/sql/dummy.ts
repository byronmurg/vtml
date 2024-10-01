import type NodeSqlInterface from "./interface"

export default
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
