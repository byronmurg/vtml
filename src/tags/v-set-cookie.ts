import CreateLoaderTag from "./loader"
import {toNum} from "../utils"

export 
const VSetCookie = CreateLoaderTag({
	name: "v-set-cookie",

	attributes: {
		"name": { required:true },
		"value": {  required:true },

		"max-seconds": {},
		"max-minutes": {},
		"max-hours": {},
		"max-days": {},
	},

	prepareChain(block) {
		return async (ctx) => {
			const attrs = block.templateAttributes(ctx)
			
			const seconds = toNum(attrs["max-seconds"], 0)
			const minutes = toNum(attrs["max-minutes"], 0)
			const hours   = toNum(attrs["max-hours"], 0)
			const days    = toNum(attrs["max-days"], 0)

			const maxAge = (seconds * 1000) + (minutes * 60000) + (hours * 60000 * 60) + (days * 60000 * 60 * 24)
			const name = attrs['name'].toString()
			const value = attrs['value'].toString()
			block.debug("set", name, value)

			return ctx.SetCookie(name, value, maxAge)
		}
	}
})
