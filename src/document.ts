import type { Element } from "./html"
import * as HTML from "./html"
import * as OAPI from "openapi3-ts/oas31"
import Debug from "debug"
import preLoad from "./pre_load"

import FilterContext from "./filter_context"
import {RootFilter} from "./types"
import FilterRoot from "./filter"
import * as utils from "./utils"
import PrepareForm, {FormDescriptor} from "./form"

const debug = Debug("starling:document")

export default
class StarlingDocument {
	public readonly forms: FormDescriptor[]
	public readonly oapiSchema: OAPI.OpenAPIObject
	private renderDocument: RootFilter

	constructor(private root:HTML.Element[]) {
		this.forms = this.prepareForms()
		this.oapiSchema = this.prepareOapiSchema()
		this.renderDocument = FilterRoot(root)
	}

	prepareForms(): FormDescriptor[] {
		const postForms = utils.findPostForms(this.root)
		return postForms.map(PrepareForm)
	}


	prepareOapiSchema() {
		const apiPaths: OAPI.OpenAPIObject["paths"] = {}
		const apiSpec: OAPI.OpenAPIObject = {
			openapi: "3.1.0",
			info: {
				title: "Starling api",
				version: "1.0",
			},
			paths: apiPaths,
		}

		for (const form of this.forms) {
			apiPaths[`/${form.name}`] = {
				post: {
					operationId: form.name,
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: form.inputSchema,
							}
						}
					}
				}
			}
		}

		return apiSpec
	}

	findHint(tag:string, attr:string): string|undefined {
		return utils.findHint(this.root, tag, attr)
	}

	findPages(): string[] {
		const pages = utils.findPages(this.root)
		return pages.map((page) => utils.requireAttribute(page, 'path'))
	}

	renderElements(ctx:FilterContext) {
		return this.renderDocument(ctx)
	}

	async renderLoader(ctx:FilterContext): Promise<string> {
		const html = await this.renderElements(ctx)
		return HTML.serialize(html)
	}

	static LoadFromString(html:string) {
		const document = HTML.parse(html)
		return new this(document)
	}

	static LoadFromFile(filePath:string) {
		const document = preLoad(filePath)
		return new this(document)
	}
}
