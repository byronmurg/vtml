import * as HTML from "./html"
import * as OAPI from "./oapi"
import preLoad from "./pre_load"

import FilterContext from "./filter_context"
import {RootFilter, Expose} from "./types"
import FilterRoot from "./filter"
import * as utils from "./utils"
import PrepareForm, {FormDescriptor} from "./form"

export default
class StarlingDocument {
	public readonly forms: FormDescriptor[]
	public readonly oapiSchema: OAPI.OpenAPIObject
	private renderDocument: RootFilter

	constructor(public readonly root:HTML.Element[]) {
		this.forms = this.prepareForms()
		this.oapiSchema = OAPI.createOpenApiSchema(this)
		this.renderDocument = FilterRoot(root)
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

	renderElements(ctx:FilterContext) {
		return this.renderDocument(ctx)
	}

	async renderLoaderMl(ctx:FilterContext): Promise<string> {
		const html = await this.renderElements(ctx)
		return HTML.serialize(html)
	}

	async renderLoader(ctx:FilterContext): Promise<string> {
		const html = await this.renderLoaderMl(ctx)
		return "<!DOCTYPE html>"+ html
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
