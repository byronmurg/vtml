import * as HTML from "./html"
import * as OAPI from "./oapi"
import preLoad from "./pre_load"

import FilterContext from "./filter_context"
import type {RootDataset, Block, RenderResponse, BodyType} from "./types"
import {MakeRootBlock} from "./block"
import PrepareForm from "./form"
import type {FormDescriptor} from "./form"
import  {Readable, PassThrough} from "stream"
import PreparePortal from "./portal"
import type {PortalDescriptor} from "./portal"
import PrepareExpose from "./expose"
import type {ExposeDescriptor} from "./expose"
import * as utils from "./utils"

async function streamToString(stream:Readable): Promise<string> {
    // lets have a ReadableStream as a stream variable
    const chunks = [];

    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString("utf-8");
}



export default
class VtmlDocument {
	public readonly forms: FormDescriptor[]
	public readonly portals: PortalDescriptor[]
	public readonly exposes: ExposeDescriptor[]
	public readonly oapiSchema: OAPI.OpenAPIObject
	private rootBlock: Block
	private pathMap: Record<string, boolean> = {}

	private constructor(root:HTML.Element[]) {
		this.rootBlock = MakeRootBlock(root)
		this.forms = this.prepareForms()
		this.portals = this.preparePortals()
		this.exposes = this.prepareExposes()
		this.oapiSchema = OAPI.createOpenApiSchema(this)
	}

	get title() {
		return utils.findTitle(this.rootBlock)
	}

	getPages() {
		return this.rootBlock.FindAll(utils.matchPage).map(
			(pageBlock) => pageBlock.attr("path")
		)
	}

	prepareForms(): FormDescriptor[] {
		const actionForms = this.rootBlock.FindAll(utils.matchActionForm)

		const forms = actionForms.map(PrepareForm)

		// Check for duplicate v-name(s). Even though the full path may be
		// different for each form the v-name must be unique.

		for (const form of forms) {

			if (this.pathMap[form.path]) {
				throw Error(`Duplicate path in form ${form.path}`)
			}

			this.pathMap[form.path] = true
		}

		return forms
	}

	preparePortals(): PortalDescriptor[] {
		const portalBlocks = this.rootBlock.FindAll(utils.matchPortal)

		const portals = portalBlocks.map(PreparePortal)

		for (const portal of portals) {

			if (this.pathMap[portal.path]) {
				throw Error(`Duplicate path in portal ${portal.path}`)
			}

			this.pathMap[portal.path] = true
		}

		return portals
	}

	prepareExposes(): ExposeDescriptor[] {
		const exposeBlocks = this.rootBlock.FindAll(utils.matchExpose)

		const exposes = exposeBlocks.map(PrepareExpose)

		for (const expose of exposes) {

			if (this.pathMap[expose.path]) {
				throw Error(`Duplicate path in expose ${expose.path}`)
			}

			this.pathMap[expose.path] = true
		}

		return exposes
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
		return new this(document)
	}

	static LoadFromFile(filePath:string) {
		const document = preLoad(filePath)
		return new this(document)
	}

	getRenderDescription() {
		return this.rootBlock.getRenderDescription()
	}
}
