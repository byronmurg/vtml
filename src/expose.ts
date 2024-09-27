import type {RootDataset, TagBlock, ExposeResult} from "./types"
import * as utils from "./utils"
import FilterContext from "./filter_context"
import {ServerError} from "./default_errors"

export
type ExposeDescriptor = {
	path: string
	load: (rootDataset:RootDataset) => Promise<ExposeResult>
}

export default
function prepareExpose(expose:TagBlock): ExposeDescriptor {

	const path = expose.attr("path")
	const src = expose.attr("src")
	const contentType = expose.attr("content-type")

	// Get the path of the nearest page
	const pagePath = expose.findAncestor(utils.byName("v-page"))?.attr("path") || "/"

	// Figure out the form path suffix
	if (!path.startsWith(pagePath)) {
		expose.error(`v-expose path ${path} must extend it's parent page ${pagePath}`)
	}

	const isolate = expose.Isolate()

	async function load(rootDataset:RootDataset): Promise<ExposeResult> {

		try {
			const preCtx = FilterContext.Init(rootDataset)

			// Execute chain
			const {ctx, found} = await isolate(preCtx)
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


			// If the chain Would otherwise redirect before rendering
			// the form we must assume that it is not visible and return
			// the redirect.
			//
			// This would be for things such as redirecting to a login
			// page when a session has expired.
			const chainRedirect = ctx.GetRedirect()
			if (chainRedirect) {
				return {
					status: 307,
					cookies,
					sendFile: "",
					redirect: chainRedirect,
				}
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

	return {
		path,
		load,
	}
}
