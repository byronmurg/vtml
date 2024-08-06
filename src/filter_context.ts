import {Pool} from "pg"
import get from "lodash/get"
import type {RootDataset} from "./types"
import Debug from "debug"

const debug = Debug("starling:ctx")

const db = new Pool()

const dbQuery = (sql:string, vars:unknown[]) => {
	debug("sql", sql, vars)
	return db.query(sql, vars)
}

type ProcessedSQL = {
	sql: string
	vars: unknown[]
}

//////////////////////////////////////////////
// Big special template regex
//////////////////////////////////////////////
const templateRegex = /(?<!\\)\$(?!{)[$\w[\].-]*/g
//                     ^^^^^^^ Cannot come after a backslash (for escaping
//                            ^^ Match the $ dollar sign
//                              ^^^^^ Cannot be preceeded by { (messes with js templates in scripts)
//                                   ^^^^^^^^^^^ Match legal characters A-z,0-9,[,],.,-

type Cookie = {
	value: string
	maxAge: number
}

const escapeHtml = (unsafe:string) => {
    return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export default
class FilterContext {
	constructor(
		public readonly dataset: unknown,
		public readonly rootDataset: RootDataset,
		private readonly parent: FilterContext|undefined = undefined,
		private setCookies: Record<string, Cookie> = {},
	) {}

	// Initialize a new dataset with only the rootDataset
	static Init(dataset:RootDataset) {
		return new FilterContext(dataset, dataset)
	}

	// Initialize a copy with a new dataset
	private copy(dataset:unknown): FilterContext {
		return new FilterContext(dataset, this.rootDataset, this, this.setCookies)
	}

	SetCookie(key:string, value:string, maxAge:number) {
		const realValue = this.templateString(value)
		// Never set an empty cookie
		if (realValue) {
			this.setCookies[key] = { value:realValue, maxAge }
		}
		return this
	}

	GetCookies() {
		return {...this.setCookies}
	}

	Select(token:string): FilterContext {
		const newDataset = this.getKey(token)
		return this.copy(newDataset)
	}

	Split(): FilterContext[] {
		if (!Array.isArray(this.dataset)) {
			// If the dataset is not an array or null just return an empty array
			return []
		} else {
			// Or split the dataset
			return this.dataset.map((sub) => this.copy(sub))
		}
	}

	async RunSQL(query:string): Promise<object[]> {
		const {sql, vars} = this.processSQL(query)
		const {rows} = await dbQuery(sql, vars)
		return rows
	}

	SetVar(target:string, data:unknown): FilterContext {
		const newDataset = (target === "$") ? data : {[target]: data}

		return this.Set(newDataset)
	}

	Set(newDataset:unknown): FilterContext {
		return this.copy(newDataset)
	}

	async AddSQLDatasource(query:string, target:string, single:boolean): Promise<FilterContext> {
		// @TODO this shouldn't be inside filter_context
		const rows = await this.RunSQL(query)
		const newDataset = single ? rows[0] : rows

		return this.SetVar(target, newDataset)
	}

	private processSQL(sql:string): ProcessedSQL {
		const vars: unknown[] = []
		const matches = sql.match(templateRegex)
		if (! matches) {
			return {sql, vars}
		}

		for (let i = 0; i < matches.length; i++) {
			const match = matches[i]
			const value = this.getKey(match)
			vars.push(value)

			sql = sql.replace(match, `$${i+1}`)
		}

		return {sql, vars}
	}

	private getLocal(key:string): unknown {
		const localVar = get(this.dataset, key)
		// If the key doesn't exist in local
		if (localVar === undefined) {
			// Check the parent (which may also be undefined)
			return this.parent?.getLocal(key)
		} else {
			return localVar
		}
	}

	processLocalKey(token:string): string {
		const key = token.substr(1)
		// RE-template the key
		return this.templateString(key)
	}

	getKey(token:string) {
		if (token === "$") {
			return this.dataset
		} else if (token.startsWith('$.')) {
			const rootKey = token.substr(2)
			return get(this.rootDataset, rootKey)
		} else if (token.startsWith("$")) {
			const key = this.processLocalKey(token)
			return this.getLocal(key)
		} else {
			throw Error(`Variable selectors must start with a '$'`)
		}
	}

	getKeySafe(token:string) {
		const value = this.getKey(token)

		switch (typeof value) {
			case "number":
			case "boolean":
				return value.toString()
			case "string":
				return escapeHtml(value)
			default:
				return ""
		}
	}

	getKeyJSON(token:string) {
		const value = this.getKey(token)
		return JSON.stringify(value)
	}

	templateString(str:string): string {
		return str.replace(templateRegex, (t) => this.getKey(t))
	}

	templateStringSafe(str:string): string {
		return str.replace(templateRegex, (t) => this.getKeySafe(t))
	}

	templateStringJson(str:string): string {
		return str.replace(templateRegex, (t) => this.getKeyJSON(t))
	}
}


