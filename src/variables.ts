import uniq from "lodash/uniq"

function getVarFromTemplate(str: string): string {
	const m = str.match(/\w+/)
	return m ? m[0] : ""
}

function notRootVar(str: string): boolean {
	return !str.startsWith("$.")
}

type TemplateSetOptions = {
	validCharacters: RegExp
	allowBrackets: boolean
}

class TemplateSet {
	constructor(private options: TemplateSetOptions) {}

	private matchVars(str: string, cbk: (s: string) => string): string {
		let ret = ""
		let inEscape = false
		let currVar = ""
		for (const c of str) {
			if (c === "\\") {
				if (inEscape) {
					ret += c
					inEscape = false
				} else {
					inEscape = true
				}
			} else if (inEscape) {
				ret += c
				inEscape = false
			} else if (currVar) {
				if (c === "$") {
					throw Error(`Invalid var ${currVar}$`)
				}

				if (c.match(this.options.validCharacters)) {
					currVar += c
				} else if (this.options.allowBrackets && c === "(") {
					continue
				} else if (this.options.allowBrackets && c === ")") {
					ret += cbk(currVar)
					currVar = ""
				} else if (currVar === "$") {
					// When we find only a single dollar sign with no valid characters
					// after it we assume that it was just a dollar sign.
					ret += currVar
					ret += c
					currVar = ""
				} else {
					ret += cbk(currVar)
					ret += c
					currVar = ""
				}
			} else if (c === "$") {
				currVar = c
			} else {
				ret += c
			}
		}

		if (currVar) {
			ret += cbk(currVar)
		}

		return ret
	}

	sanitize(str: string): string {
		return this.matchVars(str, (v) => {
			throw Error(`Variable found in sanitize ${v}`)
		})
	}

	replaceStr(str: string, cbk: (s: string) => string): string {
		return this.matchVars(str, cbk)
	}

	findTemplates(str: string): string[] {
		const vars: string[] = []
		this.matchVars(str, (v) => {
			vars.push(v)
			return ""
		})
		return vars
	}

	findVars(str: string): string[] {
		const vars = this.findTemplates(str)
			.filter(notRootVar)
			.map(getVarFromTemplate)
		return uniq(vars)
	}

	findVarsInMap(map: Record<string, unknown>) {
		let vars: string[] = []

		for (const k in map) {
			const v = map[k]

			if (typeof v === "string") {
				const attrVars = this.findVars(v)

				vars = vars.concat(attrVars)
			}
		}

		return uniq(vars)
	}

	findTemplatesInMap(map: Record<string, unknown>) {
		let vars: string[] = []

		for (const k in map) {
			const v = map[k]

			if (typeof v === "string") {
				const attrVars = this.findTemplates(v)

				vars = vars.concat(attrVars)
			}
		}

		return uniq(vars)
	}
}

export const basicTemplate = new TemplateSet({
	validCharacters: /[\w.[\]-]/,
	allowBrackets: true,
})

export const nodeTemplate = new TemplateSet({
	validCharacters: /\w/,
	allowBrackets: false,
})

export const scriptTemplate = new TemplateSet({
	validCharacters: /[\w.]/,
	allowBrackets: false,
})
