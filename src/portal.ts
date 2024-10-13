import type {RootDataset, TagBlock, PortalResult} from "./types"
import * as utils from "./utils"
import FilterContext from "./filter_context"
import {ServerError} from "./default_errors"

export
type PortalDescriptor = {
	path: string
	load: (rootDataset:RootDataset) => Promise<PortalResult>
}

export default
function preparePortal(portalTag:TagBlock): PortalDescriptor {

	// Figure out the form path suffix
	const path = portalTag.attr("path")

	// Get the path of the nearest page
	const pagePath = utils.findNearestPagePath(portalTag)

	if (!path.startsWith(pagePath)) {
		portalTag.error(`v-portal path ${path} must extend it's parent page ${pagePath}`)
	}

	const isolate = portalTag.Isolate()

	async function load(rootDataset:RootDataset): Promise<PortalResult> {

		try {
			const preCtx = FilterContext.Init(rootDataset)

			// Execute chain
			const {elements, found, ctx} = await isolate.run(preCtx)
			const cookies = ctx.GetCookies()


			// If any elements in the chain set the error
			// then we should assume that the portal
			// would otherwise not be available.
			if (ctx.InError()) {
				return {
					status: ctx.GetReturnCode(),
					cookies,
					elements: [],
				}
			}

			// If the portal would otherwise not be rendered by the
			// loader then it is in a 'not found' state and therefore
			// should return 404.
			if (! found) {
				return { status:404, cookies, elements:[] }
			}

			// If the chain Would otherwise redirect before rendering
			// the portal we must assume that it is not visible and return
			// the redirect.
			//
			// This would be for things such as redirecting to a login
			// page when a session has expired.
			const chainRedirect = ctx.GetRedirect()
			if (chainRedirect) {
				return {
					status: 307,
					cookies,
					elements: [],
					redirect: chainRedirect,
				}
			}
			
			// Extract globals from the Context and create a RenderResponse
			const status = ctx.GetReturnCode()
			const redirect = ctx.GetRedirect()

			return { status, cookies, elements, redirect }
		
		} catch(e:unknown) {
			console.error(e)

			// We assume a 500 error and just return it.
			return { status:500, cookies:{}, elements:[], error:ServerError }
		}
	}

	return {
		path,
		load,
	}
}
