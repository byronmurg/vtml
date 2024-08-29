import * as HTML from "./html"
import * as OAPI from "./oapi"
import preLoad from "./pre_load"

import FilterContext from "./filter_context"
import {RootFilter, RenderHTMLResponse, RootDataset, RenderResponse, BodyType} from "./types"
import FilterRoot from "./filter"
import * as utils from "./utils"
import PrepareForm, {FormDescriptor} from "./form"
import PreparePortal, {PortalDescriptor} from "./portal"
import PrepareExpose, {ExposeDescriptor} from "./expose"

export default
class VtmlDocument {
	public readonly forms: FormDescriptor[]
	public readonly portals: PortalDescriptor[]
	public readonly exposes: ExposeDescriptor[]
	public readonly oapiSchema: OAPI.OpenAPIObject
	private _renderDocument: RootFilter

	private constructor(public readonly root:HTML.Element[]) {
		this.forms = this.prepareForms()
		this.portals = this.preparePortals()
		this.exposes = this.prepareExposes()
		this.oapiSchema = OAPI.createOpenApiSchema(this)
		this._renderDocument = FilterRoot(root)
	}

	get title() {
		return utils.findTitle(this.root)
	}

	prepareForms(): FormDescriptor[] {
		const actionForms = utils.findActionForms(this.root)

		const forms = actionForms.map((form) => {
			const preElements = utils.getPrecedingElements(this.root, form)
			return PrepareForm(form, preElements)
		})

		// Check for duplicate v-name(s). Even though the full path may be
		// different for each form the v-name must be unique.

		const formNames:Record<string, true> = {}

		for (const form of forms) {

			if (formNames[form.name]) {
				utils.error(form.element, `Duplicate v-name`)
			}

			formNames[form.name] = true
		}

		return forms
	}

	preparePortals(): PortalDescriptor[] {
		const actionForms = utils.findPortals(this.root)

		const portals = actionForms.map((portal) => {
			const preElements = utils.getPrecedingElements(this.root, portal)
			return PreparePortal(portal, preElements)
		})

		// Check that no two portal paths are the same.

		const portalPaths:Record<string, true> = {}

		for (const portal of portals) {

			if (portalPaths[portal.path]) {
				utils.error(portal.element, `Duplicate portal path`)
			}

			portalPaths[portal.path] = true
		}

		return portals
	}

	prepareExposes(): ExposeDescriptor[] {
		const exposes = utils.findExposes(this.root)

		return exposes.map((expose) => {
			const preElements = utils.getPrecedingElements(this.root, expose)
			return PrepareExpose(expose, preElements)
		})
	}

	findHint(tag:string, attr:string): string|undefined {
		return utils.findHint(this.root, tag, attr)
	}

	findPages(): string[] {
		const pages = utils.findPages(this.root)
		return pages.map((page) => utils.requireAttribute(page, 'path'))
	}

	renderDocument(ctx:FilterContext) {
		return this._renderDocument(ctx)
	}

	async renderLoaderHTML(ctx:FilterContext): Promise<RenderHTMLResponse> {
		const response = await this.renderDocument(ctx)
		const html = HTML.serialize(response.elements)
		return {
			html,
			elements: response.elements,
			status: response.status,
			cookies: response.cookies,
		}
	}

	async renderLoaderMl(ctx:FilterContext): Promise<string> {
		const {elements} = await this.renderDocument(ctx)
		return HTML.serialize(elements)
	}

	async renderLoader(ctx:FilterContext): Promise<string> {
		const html = await this.renderLoaderMl(ctx)
		return "<!DOCTYPE html>"+ html
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
}
