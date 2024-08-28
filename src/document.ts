import * as HTML from "./html"
import * as OAPI from "./oapi"
import preLoad from "./pre_load"

import FilterContext from "./filter_context"
import {RootFilter, Expose, RenderHTMLResponse, RootDataset, RenderResponse, BodyType} from "./types"
import FilterRoot from "./filter"
import * as utils from "./utils"
import PrepareForm, {FormDescriptor} from "./form"
import PreparePortal, {PortalDescriptor} from "./portal"

export default
class StarlingDocument {
	public readonly forms: FormDescriptor[]
	public readonly portals: PortalDescriptor[]
	public readonly oapiSchema: OAPI.OpenAPIObject
	private _renderDocument: RootFilter

	private constructor(public readonly root:HTML.Element[]) {
		this.forms = this.prepareForms()
		this.portals = this.preparePortals()
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

		const formNames:Record<string, true> = {}

		for (const form of forms) {

			if (formNames[form.name]) {
				utils.error(form.element, `Duplicate x-name`)
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

		const portalPaths:Record<string, true> = {}

		for (const portal of portals) {

			if (portalPaths[portal.path]) {
				utils.error(portal.element, `Duplicate portal path`)
			}

			portalPaths[portal.path] = true
		}

		return portals
	}

	findHint(tag:string, attr:string): string|undefined {
		return utils.findHint(this.root, tag, attr)
	}

	findPages(): string[] {
		const pages = utils.findPages(this.root)
		return pages.map((page) => utils.requireAttribute(page, 'path'))
	}

	findExposes(): Expose[] {
		const exposes = utils.findExposes(this.root)
		return exposes.map((el) => ({
			path: utils.requireAttribute(el, "path"),
			contentType: utils.getAttribute(el, "content-type"),
			src: utils.requireAttribute(el, "src"),
		}))
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
