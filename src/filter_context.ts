import get from "lodash/get"
import type {RootDataset, Cookie, Branch} from "./types"
import {escapeHtml} from "./html"
import Debug from "debug"

//////////////////////////////////////////////
// Big special template regex
//////////////////////////////////////////////
const templateRegex = /(?<!\\)\$(?!\{|\()[$\w[\].-]*/g
//                     ^^^^^^^ Cannot come after a backslash (for escaping
//                            ^^ Match the $ dollar sign
//                              ^^^^^^^^ Cannot be followed by '{' or '(' (messes with js templates in scripts)
//                                   ^^^^^^^^^^^ Match legal characters A-z,0-9,[,],.,-

type Globals = {
	setCookies: Record<string, Cookie>
	redirect: string
	returnCode: number
}

const initGlobals = (): Globals => ({
	setCookies: {},
	redirect: "",
	returnCode: 200,
})

const debug = Debug("vtml:filter_context")

export default
class FilterContext {
	constructor(
		public readonly dataset: object,
		public readonly rootDataset: RootDataset,
		private readonly parent: FilterContext|undefined = undefined,
		private globals: Globals = initGlobals(),
	) {}

	// Initialize a new dataset with only the rootDataset
	static Init(dataset:RootDataset) {
		return new FilterContext({}, dataset)
	}

	static TemplateRegex = templateRegex

	// Initialize a copy with a new dataset
	private copy(dataset:object): FilterContext {
		return new FilterContext(dataset, this.rootDataset, this, this.globals)
	}

	//
	// Globals
	//

	SetCookie(key:string, value:string, maxAge:number) {
		// Never set an empty cookie
		if (value) {
			this.globals.setCookies[key] = { value, maxAge }
		}
		return this
	}

	SetRedirect(path:string) {
		const realValue = this.templateString(path)
		this.globals.redirect = realValue

		return this
	}

	SetReturnCode(returnCode:number) {
		this.globals.returnCode = returnCode
		return this
	}

	GetCookies() {
		return {...this.globals.setCookies}
	}

	GetRedirect() {
		return this.globals.redirect
	}

	GetReturnCode() {
		return this.globals.returnCode
	}

	// Error methods

	InError():boolean {
		return !!this.rootDataset.error 
	}

	GetErrorMessage() {
		return this.rootDataset.error?.message
	}


	SetError(code:number, message:string) {
		this.globals.returnCode = code
		this.rootDataset.error = { code, message }
		return this
	}


	// Alter methods

	Select(token:string): FilterContext {
		const newDataset = this.getKey(token)
		return this.copy(newDataset)
	}

	// @TODO remove
	Split(): FilterContext[] {
		if (!Array.isArray(this.dataset)) {
			// If the dataset is not an array or null just return an empty array
			return []
		} else {
			// Or split the dataset
			return this.dataset.map((sub) => this.copy(sub))
		}
	}

	SplitAs(as:string): FilterContext[] {
		if (!Array.isArray(this.dataset)) {
			// If the dataset is not an array or null just return an empty array
			return []
		} else {
			// Or split the dataset
			return this.dataset.map((sub) => this.SetVar(as, sub))
		}
	}


	SetVar(target:string, data:unknown): FilterContext {
		const key = target.substr(1)
		debug("set", key)
		const newDataset = {[key]: data}

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

	Merge(rhs:FilterContext): FilterContext {
		return new FilterContext(
			{ ...this.dataset, ...rhs.dataset },
			this.rootDataset,
			this.parent,
			this.globals,
		)
	}

	getKey(token:string) {
		if (token.startsWith('$.')) {
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

		if (value instanceof Date) {
			return value.toJSON()
		}

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

	filterPass(): Branch {
		return { ctx:this, elements:[] }
	}
}


