import uniq from "lodash/uniq"
import FilterContext from "./filter_context"

export
function getTemplatesInString(str:string): string[] {
	return uniq(str.match(FilterContext.TemplateRegex) || [])
}

function getVarFromTemplate(str:string): string {
	const m = str.match(/\$\w+/)
	return m ? m[0] : ""
}

export
function getVarsInString(str:string): string[] {
	return getTemplatesInString(str).map(getVarFromTemplate)
		.filter((v) => !!v) // @TODO this is stripping root vars too
}

export
function getVarsInMap(map:Record<string, unknown>): string[] {
	let vars:string[] = []

	for (const k in map) {
		const v = map[k]

		if (typeof(v) === "string") {
			const attrVars = getVarsInString(v)

			vars = vars.concat(attrVars)
		}
	}

	return vars
}

