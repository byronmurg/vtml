import type FilterContext from "./filter_context"

// A regex for matching vars in x-nodejs
const nodeVarRegex = /(?<!\\)\$\w+/g

const inbuiltVars: Record<string, any> = {
	require: require,
}

export default
function prepare(body:string, idAttr:string) {
	// Find ant ctx variables used by the js body
	const injectVars = body.match(nodeVarRegex) || []

	// Extra details to add to Any error message
	const extra = idAttr ? `(id ${idAttr})` : ""

	const inbuiltKeys = Object.keys(inbuiltVars)

	const buildFunction = () => {
		try {
			return new Function("$", ...inbuiltKeys, ...injectVars, `return (async () => {\n ${body} \n})()`)
		} catch (e:any) {
			throw Error(`Syntax error in x-node ${extra}: ${e.message}`)
		}
	}

	// Build a function object
	const fnc = buildFunction()
	
	return async (ctx:FilterContext): Promise<any> => {
		// Root is always passed in
		const args = [ctx.rootDataset]

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
		} catch (e:any) {
			throw Error(`Error in x-node ${extra}: ${e.message}`)
		}
	}
}

