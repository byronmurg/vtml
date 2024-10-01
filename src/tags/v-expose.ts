import CreatePassthroughTag from "./passthrough"
import type {VtmlTag} from "../types"
import {getPathParameterGlobals} from "../page"

const VExposePassthrough = CreatePassthroughTag({
	name: "v-expose",
	attributes: {
		src: { required:true, relative:true },
		path: { required:true, special:true },
	},
})

// Follow the behaviour of a passthrough but
// inject globals as defined in the path.

export
const VExpose:VtmlTag = {
	...VExposePassthrough,
	prepare(block) {
		const def = VExposePassthrough.prepare(block)

		const path = block.attr("path")
		const globals = getPathParameterGlobals(path)

		return {
			...def,
			injectGlobals: () => globals,
		}
	}
}
