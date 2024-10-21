import type {InitializationResponse, TagBlock} from "../types"
import type RootBlock from "../block/root_block"

import PathMap from "../path_map"

import PrepareForm from "./form"
import type {FormDescriptor} from "./form"
export type {FormDescriptor} from "./form"

import PreparePortal from "./portal"
import type {PortalDescriptor} from "./portal"
export type {PortalDescriptor} from "./portal"

import PrepareExpose from "./expose"
import type {ExposeDescriptor} from "./expose"
export type {ExposeDescriptor} from "./expose"

import PreparePage from "./page"
import type {PageDescriptor} from "./page"
export type {PageDescriptor} from "./page"

import PrepareSubscribe from "./subscribe"
import type {SubscribeDescriptor} from "./subscribe"
export type {SubscribeDescriptor} from "./subscribe"

import * as utils from "../utils"

type IsolateComponents = {
	forms: FormDescriptor[]
	portals: PortalDescriptor[]
	exposes: ExposeDescriptor[]
	pages: PageDescriptor[]
	subscribes: SubscribeDescriptor[]
}

interface IsolateCommon {
	path: string
	block: TagBlock
}

type AdditionalCheck = (block:TagBlock) => boolean
const ok: AdditionalCheck = () => true

class IsolateInitializer {
	private pathMap: PathMap

	constructor(private rootBlock:RootBlock){
		this.pathMap = new PathMap()
	}

	private prepareComponent<Out extends IsolateCommon>(
		tagName:string,
		prepare:(block:TagBlock) => InitializationResponse<Out>,
		additionalCheck:AdditionalCheck = ok,
	): InitializationResponse<Out[]> {
		const blocks = this.rootBlock.FindAll(utils.byName(tagName)).filter(additionalCheck)
		const responses = blocks.map(prepare)

		const result = utils.ValidateAgg<Out>(...responses)

		if (result.ok) {
			for (const isolate of result.result) {
				this.pathMap.check(isolate.block, isolate.path)
			}
		}

		return result
	}

	Prepare(): InitializationResponse<IsolateComponents> {
		
		// Prepare all pages
		const pageResponse = this.prepareComponent("v-page", PreparePage)
		if (! pageResponse.ok) {
			return pageResponse
		}
		const pages = pageResponse.result

		// Prepare all forms
		const formResponse = this.prepareComponent("form", PrepareForm, (block) => !!block.attr("v-name"))
		if (! formResponse.ok) {
			return formResponse
		}
		const forms = formResponse.result

		// Prepare all portals
		const portalResponse = this.prepareComponent("v-portal", PreparePortal)
		if (! portalResponse.ok) {
			return portalResponse
		}
		const portals = portalResponse.result

		// Prepare all exposes
		const exposeResponse = this.prepareComponent("v-expose", PrepareExpose)
		if (! exposeResponse.ok) {
			return exposeResponse
		}
		const exposes = exposeResponse.result

		// Prepare all subscribes
		const subscribeResponse = this.prepareComponent("v-subscribe", PrepareSubscribe)
		if (! subscribeResponse.ok) {
			return subscribeResponse
		}
		const subscribes = subscribeResponse.result

		if (! this.pathMap.ok) {
			return this.pathMap.Fail()
		}

		return utils.Ok({
			forms,
			pages,
			portals,
			exposes,
			subscribes,
		})
	}
}

export default
function prepareIsolates(rootBlock:RootBlock): InitializationResponse<IsolateComponents> {
	const initializer = new IsolateInitializer(rootBlock)
	return initializer.Prepare()
}
