import CreateLoaderTag from "./loader"
import NodeFunction from "../node"
import path from "node:path"
import Debug from "debug"
import {nodeTemplate} from "../variables"

const debug = Debug("vtml:tag:v-nodejs")

function determineImportPath(importAttr:string, filename:string) {
	debug("determineImportPath", importAttr)
	if (importAttr.startsWith("./")) {
		const resolved = path.relative(__dirname, path.dirname(filename))
		debug("resolved", resolved)
		const actualPath = path.join(resolved, importAttr)
		debug("actual import path", actualPath)
		return actualPath
	} else {
		// Otherwise we are importing a library directly
		return importAttr
	}
}

export
const VNodeJs = CreateLoaderTag({
	name: "v-nodejs",

	attributes: {
		"target": { target:true },
		"import": { special:true },
	},
	bodyPolicy:  "allowTextOnly",
	templateSet: nodeTemplate,

	prepareChain(block) {
		const importAttr = block.attr("import")
		const targetAttr = block.targetAttr()

		if (importAttr) {
			// Make sure that we have no inline body
			if (block.hasChildren()) {
				throw Error(`cannot have a body when import is set`)
			}

			const jsPath = determineImportPath(importAttr, block.el.filename)
			// Import now then just resolve each request
			const js = import(jsPath)
			return (ctx) => js.then((lib) => ctx.SetVar(targetAttr, lib.default))
		} else {
			// If no import is specified then this is an inline
			// nodejs function.
			const body = block.requireOneTextChild()
			const fnc = NodeFunction(body)

			return async (ctx) => {
				const output = await fnc(ctx)
				return ctx.SetVar(targetAttr, output)
			}
		}
	}
})

