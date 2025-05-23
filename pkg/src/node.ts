import FilterContext from "./filter_context"
import nodeInterFace from "./sql"
import * as Vars from "./variables"
import YAML from "yaml"

const inbuiltVars: Record<string, unknown> = {
	require: require,
	sql: nodeInterFace,
	YAML,
}

export default
function prepare(body:string) {
	// Find any ctx variables used by the js body
	const {locals} = Vars.nodeTemplate.findAllVars(body)
	const injectVars = locals

	const inbuiltKeys = Object.keys(inbuiltVars)

	const buildFunction = () => {
		try {
			return new Function(
				"$",
				...inbuiltKeys,
				...injectVars,
				`return (async () => {\n ${body} \n})()`
			)
		} catch (err) {
			const e = err as Error
			throw Error(`Syntax error in v-node: ${e.message}`)
		}
	}

	// Build a function object
	const fnc = buildFunction()
	
	return async (ctx:FilterContext): Promise<unknown> => {
		// Root is always passed in
		const args:unknown[] = [ctx.rootDataset]

		for (const k in inbuiltVars) {
			const v = inbuiltVars[k]
			args.push(v)
		}

		// Push each of the injected vars
		for (const v of injectVars) {
			args.push(ctx.getKey(v))
		}

		try {
			// Call our function
			return await fnc(...args)
		} catch (err) {
			const e = err as Error
			throw Error(`Error in v-node: ${e.message}`)
		}
	}
}

