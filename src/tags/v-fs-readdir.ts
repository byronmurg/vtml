import CreateLoaderTag from "./loader"
import {readdir} from "fs/promises"

export 
const VFsReaddir = CreateLoaderTag({
	name: "v-fs-readdir",

	attributes: {
		"path": { relative:true, required:true },
		"target": { target:true, required:true },
	},
	bodyPolicy: "deny",

	prepareChain(block) {
		const target = block.targetAttr()
		return async (ctx) => {
			const {path} = block.templateAttributes(ctx)
			const files = await readdir(path.toString())
			return ctx.SetVar(target, files)
		}
	}
})
