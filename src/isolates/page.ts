import type {RootDataset, TagBlock, PortalResult, InitializationResponse} from "../types"
import FilterContext from "../filter_context"
import {ServerError} from "../default_errors"
import * as utils from "../utils"
import ValidationSet from "../validation_set"

export
function getPathParameters(path:string): string[] {
	const partsRaw = path.match(/:\w+/g) || []
	return partsRaw.map((part) => part.replace(/^:/, ''))
}

export
function getPathParameterGlobals(path:string): string[] {
	const params = getPathParameters(path)
	return params.map((param) => `$.params.${param}`)
}

export
type PageDescriptor = {
	path: string
	block: TagBlock
	load: (rootDataset:RootDataset) => Promise<PortalResult>
}

export default
function preparePage(pageTag:TagBlock): InitializationResponse<PageDescriptor> {
	const validationSet = new ValidationSet(pageTag)

	const path = pageTag.attr("path")

	// Get the path of the nearest page
	const parentPath = utils.findNearestPagePath(pageTag)

	if (! path.startsWith(parentPath)) {
		validationSet.error(`Page path '${path}' must start with it's parent path ${parentPath}`)
	}

	if (! validationSet.isOk) {
		return validationSet.Fail()
	}

	const isolate = pageTag.Isolate()

	async function load(rootDataset:RootDataset): Promise<PortalResult> {

		try {
			const preCtx = FilterContext.Init(rootDataset)

			// Execute chain
			const {elements, found, ctx} = await isolate.run(preCtx)
			const cookies = ctx.GetCookies()

			// If any elements in the chain set the error
			// then we should assume that the page
			// would otherwise not be available.
			if (ctx.InError()) {
				return {
					status: ctx.GetReturnCode(),
					cookies,
					elements: [],
				}
			}

			// If the page would otherwise not be rendered by the
			// loader then it is in a 'not found' state and therefore
			// should return 404.
			if (! found) {
				const cookies = ctx.GetCookies()
				return { status:404, cookies, elements:[] }
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

	return utils.Ok({
		path,
		block:pageTag,
		load,
	})
}
