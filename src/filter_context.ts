import {Pool} from "pg"
import get from "lodash/get"
import type {RootDataset} from "./types"
import Debug from "debug"

const debug = Debug("starling:ctx")

const db = new Pool()

const dbQuery = (sql:string, vars:any[]) => {
	debug("sql", sql, vars)
	return db.query(sql, vars)
}

type ProcessedSQL = {
	sql: string
	vars: any[]
}

const templateRegex = /(?<!\\)\$[\$\w\[\]\.-]*/g


export default
class FilterContext {
	constructor(
		public readonly dataset: any,
		public readonly rootDataset: RootDataset,
		private readonly parent: FilterContext|undefined = undefined,
	) {}

	// Initialize a new dataset with only the rootDataset
	static Init(dataset:RootDataset) {
		return new FilterContext(dataset, dataset)
	}

	// Initialize a copy with a new dataset
	private copy(dataset:any): FilterContext {
		return new FilterContext(dataset, this.rootDataset, this)
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

	async RunSQL(query:string): Promise<any[]> {
		const {sql, vars} = this.processSQL(query)
		const {rows} = await dbQuery(sql, vars)
		return rows
	}

	SetVar(target:string, data:any): FilterContext {
		const newDataset = {
			...this.dataset,
			[target]: data,
		}

		return this.copy(newDataset)
	}

	async AddSQLDatasource(query:string, target:string): Promise<FilterContext> {
		const rows = await this.RunSQL(query)
		const newDataset = {
			...this.dataset,
			[target]: rows,
		}

		return this.copy(newDataset)
	}

	private processSQL(sql:string): ProcessedSQL {
		const vars: any[] = []
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

	private getLocal(key:string): any {
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


	templateString(str:string): string {
		debug("Template string", str)
		return str.replace(templateRegex, (t) => this.getKey(t))
	}
}


