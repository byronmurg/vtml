import type {RootDataset, ElementChain, PortalResult} from "./types"
import type {TagElement} from "./html"
import * as utils from "./utils"
import {prepareChain, createPortalFilter} from "./filter"
import FilterContext from "./filter_context"
import pathLib from "path"

export
type PortalDescriptor = {
	path: string

	element: TagElement
	load: (rootDataset:RootDataset) => Promise<PortalResult>
}

export default
function preparePortal(portalTag:TagElement, preElements:ElementChain[]): PortalDescriptor {

	const xName = utils.getAttribute(portalTag, "x-name")

	if (! xName) {
		utils.error(portalTag, `No x-name set`)
	}

	// Get the path of the nearest page
	const pagePath = utils.getPagePath(preElements)

	// Figure out the form path suffix
	const path = pathLib.posix.join(pagePath, xName)

	const chain = prepareChain(preElements)

	const portalFilter = createPortalFilter(portalTag)

	async function load(rootDataset:RootDataset): Promise<PortalResult> {

		try {
			const preCtx = FilterContext.Init(rootDataset)

			// Execute chain
			const chainResult = await chain(preCtx)

			// If the portal would otherwise not be rendered by the
			// loader then it is in a 'not found' state and therefore
			// should return 404.
			if (! chainResult.found) {
				const cookies = chainResult.ctx.GetCookies()
				return { status:404, cookies, elements:[] }
			}

			// If any elements in the chain set the return code to
			// a non-success code then we should assume that the portal
			// would otherwise not be available.
			const chainCode = chainResult.ctx.GetReturnCode()
			if (chainCode >= 400) {
				return {
					status: chainCode,
					cookies: {},
					elements: [],
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
					elements: [],
					redirect: chainRedirect,
				}
			}

			// Finally we execute the chain with the filter context
			// of the preceeding chain.
			const {ctx, elements} = await portalFilter(chainResult.ctx)
			
			// Extract globals from the Context and create a RenderResponse
			const cookies = ctx.GetCookies()
			const status = ctx.GetReturnCode()
			const redirect = ctx.GetRedirect()

			return { status, cookies, elements, redirect }
		
		} catch(e:unknown) {
			console.error(e)

			// We assume a 500 error and just return it.
			const error = (e instanceof Error) ? e.message : ""
			return { status:500, cookies:{}, elements:[], error }
		}
	}

	return {
		path,
		element: portalTag,
		load,
	}
}
