import type {RootDataset, TagBlock, InitializationResponse, ExposeResult} from "../types"
import * as utils from "../utils"
import FilterContext from "../filter_context"
import {ServerError} from "../default_errors"
import ValidationSet from "../validation_set"

export
type ExposeDescriptor = {
	path: string
	load: (rootDataset:RootDataset) => Promise<ExposeResult>
	block: TagBlock
}

export default
function prepareExpose(expose:TagBlock): InitializationResponse<ExposeDescriptor> {
	const validationSet = new ValidationSet(expose)

	const path = expose.attr("path")
	const src = expose.attr("src")
	const contentType = expose.attr("content-type")

	// Get the path of the nearest page
	const pagePath = utils.findNearestPagePath(expose)

	// Figure out the form path suffix
	if (!path.startsWith(pagePath)) {
		validationSet.error(`v-expose path ${path} must extend it's parent page ${pagePath}`)
	}

	if (! validationSet.isOk) {
		return validationSet.Fail()
	}

	const isolate = expose.Isolate()

	async function load(rootDataset:RootDataset): Promise<ExposeResult> {

		try {
			const preCtx = FilterContext.Init(rootDataset)

			// Execute chain
			const {ctx, found} = await isolate.run(preCtx)
			const cookies = ctx.GetCookies()

			// If any elements in the chain set the error
			// then we should assume that the expose
			// would otherwise not be available.
			if (ctx.InError()) {
				return {
					status: ctx.GetReturnCode(),
					cookies,
					sendFile: "",
				}
			}

			// If the expose would otherwise not be rendered by the
			// loader then it is in a 'not found' state and therefore
			// should return 404.
			if (! found) {
				const cookies = ctx.GetCookies()
				return { status:404, cookies, sendFile:"" }
			}
			
			// Extract globals from the Context and create a RenderResponse
			const status = ctx.GetReturnCode()
			const redirect = ctx.GetRedirect()

			const sendFile = ctx.templateStringSafe(src)

			return { status, cookies, sendFile, redirect, contentType }
		
		} catch(e:unknown) {
			console.error(e)

			// We assume a 500 error and just return it.
			return { status:500, cookies:{}, sendFile:"", error:ServerError }
		}
	}

	return utils.Ok({
		path,
		block: expose,
		load,
	})
}
