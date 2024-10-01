import CreateLoaderTag from "./loader"
import NodeFunction from "../node"
import {dirname} from "node:path"

function determineImportPath(importAttr:string, filename:string) {
	if (importAttr.startsWith("./")) {
		// If the import starts with './' then the import
		// is relative so we must figure out the actualt path.
		const dir = dirname(filename)
		return `${process.cwd()}/${dir}/${importAttr}`
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

	prepareChain(block) {
		const importAttr = block.attr("import")
		const targetAttr = block.targetAttr()

		if (importAttr) {
			// Make sure that we have no inline body
			if (block.hasChildren()) {
				block.error(`cannot have a body when import is set`)
			}

			const jsPath = determineImportPath(importAttr, block.el.filename)
			// Import now then just resolve each request
			const js = import(jsPath)
			return (ctx) => js.then((lib) => ctx.SetVar(targetAttr, lib))
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

