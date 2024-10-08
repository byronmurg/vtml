import CreateLoaderTag from "./loader"
import {toNumberDefault} from "../utils"

export 
const VSetStatus = CreateLoaderTag({
	name: "v-set-status",

	attributes: {
		"code": {  required:true },
	},

	prepareChain(block) {
		return async (ctx) => {
			const attrs = block.templateAttributes(ctx)
			const code = toNumberDefault(attrs["code"], 200)
			return ctx.SetReturnCode(code)
		}
	}
})
