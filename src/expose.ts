import type {RootDataset, ElementChain, ExposeResult} from "./types"
import type {TagElement} from "./html"
import * as utils from "./utils"
import {prepareLoaderChain} from "./filter"
import FilterContext from "./filter_context"
import pathLib from "path"

export
type ExposeDescriptor = {
	path: string
	element: TagElement
	load: (rootDataset:RootDataset) => Promise<ExposeResult>
}

export default
function prepareExpose(exposeTag:TagElement, preElements:ElementChain[]): ExposeDescriptor {

	const subPath = utils.requireAttribute(exposeTag, "path")
	const src = utils.requireAttribute(exposeTag, "src")
	const contentType = utils.getAttribute(exposeTag, "content-type")

	// Get the path of the nearest page
	const pagePath = utils.getPagePath(preElements)

	// Figure out the form path suffix
	const path = pathLib.posix.join(pagePath, subPath)

	const chain = prepareLoaderChain(preElements)

	async function load(rootDataset:RootDataset): Promise<ExposeResult> {

		try {
			const preCtx = FilterContext.Init(rootDataset)

			// Execute chain
			const chainResult = await chain(preCtx)

			// If the expose would otherwise not be rendered by the
			// loader then it is in a 'not found' state and therefore
			// should return 404.
			if (! chainResult.found) {
				const cookies = chainResult.ctx.GetCookies()
				return { status:404, cookies, sendFile:"" }
			}

			// If any elements in the chain set the return code to
			// a non-success code then we should assume that the expose
			// would otherwise not be available.
			const chainCode = chainResult.ctx.GetReturnCode()
			if (chainCode >= 400) {
				return {
					status: chainCode,
					cookies: {},
					sendFile: "",
				}
			}

			// If the chain Would otherwise redirect before rendering
			// the form we must assume that it is not visible and return
			// the redirect.
			//
			// This would be for things such as redirecting to a login
			// page when a session has expired.
			const chainRedirect = chainResult.ctx.GetRedirect()
			if (chainRedirect) {
				return {
					status: 307,
					cookies: {},
					sendFile: "",
					redirect: chainRedirect,
				}
			}

			// Expose doesn't modify filter so we just use the chain one
			const ctx = chainResult.ctx
			
			// Extract globals from the Context and create a RenderResponse
			const cookies = ctx.GetCookies()
			const status = ctx.GetReturnCode()
			const redirect = ctx.GetRedirect()

			const sendFile = ctx.templateStringSafe(src)

			return { status, cookies, sendFile, redirect, contentType }
		
		} catch(e:unknown) {
			console.error(e)

			// We assume a 500 error and just return it.
			const error = (e instanceof Error) ? e.message : ""
			return { status:500, cookies:{}, sendFile:"", error }
		}
	}

	return {
		path,
		element: exposeTag,
		load,
	}
}
