import get from "lodash/get"
import type {RootDataset, ResponseError, Cookie, Branch} from "./types"
import {escapeHtml} from "./html"
import Debug from "debug"
import * as Vars from "./variables"

const templateRegex = /(?<!\\)\$([\w.\-[\]]+|\([\w.\-[\]]+\))/g
//                     ^^^^^^^ Cannot come after a backslash (for escaping
//                            ^^ Match the $ dollar sign
//                               ^^^^^^^^^^ Match legal characters A-z,0-9,[,],.,-
//                                         ^ OR
//                                          ^^^^^^^^^^^^^^^ Match legal characters inside brackets

const scriptRegex = /(?<!\\)\$[.\w]+/g
//                   ^^^^^^^ Cannot come after a backslash (for escaping
//                          ^^ Match the $ dollar sign
//                            ^^^^^^ Match legal characters A-z,0-9,.

const nodeRegex = /(?<!\\)\$\w+/g
//                 ^^^^^^^ Cannot come after a backslash (for escaping
//                        ^^ Match the $ dollar sign
//                          ^^^ Match legal characters A-z,0-9

type Globals = {
	setCookies: Record<string, Cookie>
	redirect: string
	returnCode: number
	error?: ResponseError
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

	// Initialize with error
	static InitError(dataset:RootDataset, error:ResponseError) {
		return new FilterContext({}, dataset, undefined, {
			...initGlobals(),
			error,
			returnCode: error.code,
		})
	}

	static TemplateRegex = templateRegex
	static ScriptRegex = scriptRegex
	static NodeRegex = nodeRegex

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
		return !!this.globals.error 
	}

	GetError() {
		return this.globals.error
	}

	GetErrorMessage() {
		return this.globals.error?.message
	}


	SetError(code:number, message:string) {
		this.globals.returnCode = code
		this.globals.error = { code, message }
		return this
	}

	UnsetError() {
		// Unset error but leave the return code
		this.globals.error = undefined
		return this
	}


	// Alter methods

	Select(token:string, as:string): FilterContext {
		const newDataset = this.getKey(token)
		return this.SetVar(as, newDataset)
	}

	SetVar(target:string, data:unknown): FilterContext {
		// Just return if target is empty
		if (! target) return this

		const key = target.substr(1)
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

	Merge(rhs:FilterContext): FilterContext {
		return new FilterContext(
			{ ...this.dataset, ...rhs.dataset },
			this.rootDataset,
			this.parent,
			this.globals,
		)
	}

	getKey(token:string) {
		token = Vars.getPathFromTemplate(token)
		if (token.startsWith('.')) {
			const rootKey = token.substr(1)
			return get(this.rootDataset, rootKey)
		} else {
			return this.getLocal(token)
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

	templateScript(str:string): string {
		// @NOTE uses script regex
		return str.replace(scriptRegex, (t) => this.getKeyJSON(t))
	}

	filterPass(): Branch {
		return { ctx:this, elements:[] }
	}
}


