import get from "lodash/get"
import type {RootDataset} from "./types"
import {escapeHtml} from "./html"

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

type Globals = {
	setCookies: Record<string, Cookie>
	redirect: string
}

const initGlobals = (): Globals => ({
	setCookies: {},
	redirect: "",
})

export default
class FilterContext {
	constructor(
		public readonly dataset: unknown,
		public readonly rootDataset: RootDataset,
		private readonly parent: FilterContext|undefined = undefined,
		private globals: Globals = initGlobals(),
	) {}

	// Initialize a new dataset with only the rootDataset
	static Init(dataset:RootDataset) {
		return new FilterContext(dataset, dataset)
	}

	static TemplateRegex = templateRegex

	// Initialize a copy with a new dataset
	private copy(dataset:unknown): FilterContext {
		return new FilterContext(dataset, this.rootDataset, this, this.globals)
	}

	//
	// Globals
	//

	SetCookie(key:string, value:string, maxAge:number) {
		const realValue = this.templateString(value)
		// Never set an empty cookie
		if (realValue) {
			this.globals.setCookies[key] = { value:realValue, maxAge }
		}
		return this
	}

	SetRedirect(path:string) {
		const realValue = this.templateString(path)
		this.globals.redirect = realValue

		return this
	}

	GetCookies() {
		return {...this.globals.setCookies}
	}

	GetRedirect() {
		return this.globals.redirect
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

	SetVar(target:string, data:unknown): FilterContext {
		const newDataset = (target === "$") ? data : {[target]: data}

		return this.Set(newDataset)
	}

	Set(newDataset:unknown): FilterContext {
		return this.copy(newDataset)
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


