import type {RootDataset, TagBlock, SubscribeResult} from "./types"
import * as utils from "./utils"
import FilterContext from "./filter_context"
import {ServerError} from "./default_errors"

export
type SubscribeDescriptor = {
	path: string
	canSubscribe: (rootDataset:RootDataset) => Promise<SubscribeResult>
}

export default
function prepareSubscribe(subscribe:TagBlock): SubscribeDescriptor {

	const channelPath = subscribe.attr("path")

	// Get the path of the nearest page
	const pagePath = utils.findNearestPagePath(subscribe)

	if (!channelPath.startsWith(pagePath)) {
		subscribe.error(`v-subscribe path ${channelPath} must extend it's parent page ${pagePath}`)
	}

	const isolate = subscribe.Isolate()

	async function canSubscribe(rootDataset:RootDataset): Promise<SubscribeResult> {

		try {
			const preCtx = FilterContext.Init(rootDataset)

			// Execute chain
			const {ctx, found} = await isolate.run(preCtx)
			const cookies = ctx.GetCookies()
			const channel = ctx.rootDataset.path

			// If any elements in the chain set the error
			// then we should assume that the expose
			// would otherwise not be available.
			if (ctx.InError()) {
				return {
					status: ctx.GetReturnCode(),
					cookies,
					channel,
				}
			}

			// If the subscribe would otherwise not be rendered by the
			// loader then it is in a 'not found' state and therefore
			// should return 404.
			if (! found) {
				const cookies = ctx.GetCookies()
				return { status:404, cookies, channel }
			}
			
			// Extract globals from the Context and create a RenderResponse
			const status = ctx.GetReturnCode()
			const redirect = ctx.GetRedirect()

			return { status, cookies, redirect, channel }
		
		} catch(e:unknown) {
			console.error(e)

			// We assume a 500 error and just return it.
			return { status:500, cookies:{}, error:ServerError, channel:"" }
		}
	}

	return {
		path:channelPath,
		canSubscribe,
	}
}
