import * as HTML from "./html"
import * as OAPI from "./oapi"
import preLoad from "./pre_load"

import FilterContext from "./filter_context"
import type {RootDataset, Block, RenderResponse, BodyType, InitializationResponse} from "./types"
import {MakeRootBlock} from "./block"
import  {Readable, PassThrough} from "stream"
import type {FormDescriptor, SubscribeDescriptor, PortalDescriptor, ExposeDescriptor, PageDescriptor} from "./isolates"
import * as utils from "./utils"
import prepareIsolates from "./isolates"

async function streamToString(stream:Readable): Promise<string> {
    const chunks:string[] = [];

    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk).toString())
    }

    return chunks.join("")
}

type VtmlDocumentComponents = {
	rootBlock: Block
	forms: FormDescriptor[]
	portals: PortalDescriptor[]
	exposes: ExposeDescriptor[]
	pages: PageDescriptor[]
	subscribes: SubscribeDescriptor[]

	//oapiSchema: OAPI.OpenAPIObject
}


export default
class VtmlDocument {
	private readonly rootBlock: Block
	public readonly forms: FormDescriptor[]
	public readonly portals: PortalDescriptor[]
	public readonly exposes: ExposeDescriptor[]
	public readonly pages: PageDescriptor[]
	public readonly subscribes: SubscribeDescriptor[]

	public readonly oapiSchema: OAPI.OpenAPIObject
	public readonly hasCatch: boolean

	private constructor(components:VtmlDocumentComponents) {
		this.rootBlock = components.rootBlock
		this.forms = components.forms
		this.pages = components.pages
		this.portals = components.portals
		this.exposes = components.exposes
		this.subscribes = components.subscribes

		this.oapiSchema = OAPI.createOpenApiSchema(this)
		this.hasCatch = !!this.rootBlock.Find(utils.byName("v-catch"))
	}

	static Init(root:HTML.Element[]): InitializationResponse<VtmlDocument> {
		const rootBlockResponse = MakeRootBlock(root)
		if (!rootBlockResponse.ok) {
			return rootBlockResponse
		}
		const rootBlock = rootBlockResponse.result

		const isolateResponse = prepareIsolates(rootBlock)
		if (! isolateResponse.ok) {
			return isolateResponse
		}

		const isolateComponents = isolateResponse.result
		
		const doc = new VtmlDocument({
			rootBlock,
			...isolateComponents,
		})

		return utils.Ok(doc)
	}


	get title() {
		return utils.findTitle(this.rootBlock)
	}

	getPages() {
		return this.pages
	}

	findHint(tag:string, attr:string): string|undefined {
		return utils.findHint(this.rootBlock, tag, attr)
	}

	async renderDocument(inputCtx:FilterContext): Promise<RenderResponse> {
		const {elements, ctx} = await this.rootBlock.Render(inputCtx)

		return {
			elements,
			status: ctx.GetReturnCode(),
			cookies: ctx.GetCookies(),
			redirect: ctx.GetRedirect(),
		}

	}

	async renderLoaderMl(ctx:FilterContext): Promise<string> {
		const s = new PassThrough()
		const {elements} = await this.renderDocument(ctx)
		HTML.serialize(elements, s)
		return streamToString(s)
	}

	async executeFormByName(name:string, rootDataset:RootDataset, body:BodyType): Promise<RenderResponse> {
		const form = this.forms.find((form) => form.name === name)

		if (! form) {
			return { status:404, elements:[], cookies:{} }
		}

		return form.execute(rootDataset, body)
	}

	static LoadFromString(html:string) {
		const document = HTML.parse(html, "<string>")
		return VtmlDocument.Init(document)
	}

	static LoadFromFile(filePath:string) {
		const document = preLoad(filePath)
		return VtmlDocument.Init(document)
	}

	getRenderDescription() {
		return this.rootBlock.getRenderDescription()
	}
}
