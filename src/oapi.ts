import type { TagElement } from "./html"
import type StarlingDocument from "./document"
import * as OAPI from "openapi3-ts/oas31"
import * as utils from "./utils"
export * from "openapi3-ts/oas31"

function createStringInputSchema(input:TagElement): [OAPI.SchemaObject, boolean] {
	const required = utils.getBoolAttribute(input, "required")

	let minLength = utils.optNumAttribute(input, "minLength")

	if (required && !minLength) {
		minLength = 1
	}

	const property: OAPI.SchemaObject = {
		type: "string",
		pattern: utils.optAttribute(input, "pattern"),
		maxLength: utils.optNumAttribute(input, "maxlength"),
		minLength,
	}

	return [property, required]
}

function createBoolInputSchema(): [OAPI.SchemaObject, boolean] {
	const property: OAPI.SchemaObject = {
		type: "boolean",
	}
	return [property, true]
}

function createNumberInputSchema(): [OAPI.SchemaObject, boolean] {
	const property: OAPI.SchemaObject = {
		type: "number"
	}
	return [property, true]
}

function createInputSchema(input:TagElement): [OAPI.SchemaObject, boolean] {
	
	switch (utils.getAttribute(input, "type")) {
		case "range":
		case "number":
			return createNumberInputSchema()
		case "checkbox":
			return createBoolInputSchema()
		default:
			// Text by default
			return createStringInputSchema(input)
	}
}

function wrapSelectMulti(items:OAPI.SchemaObject): OAPI.SchemaObject {
	return { type:"array", items }
}

function createSelectSchema(input:TagElement): [OAPI.SchemaObject, boolean] {
	const options = utils.findElement(input.elements, (child) => child.name === "option")
	const enumOptions: string[] = []

	for (const option of options) {
		const nElements = option.elements?.length || 0
		if (nElements > 1) {
			utils.error(option, "Too many children")
		}

		const textEl = utils.getText(option)
		const value = utils.getAttribute(option, "value")
		if (value){
			enumOptions.push(value)
		} else if (! textEl) {
			// There may be no text element for an empty option
			enumOptions.push("")
		} else {
			enumOptions.push(textEl)
		}
	}

	const enumProperty: OAPI.SchemaObject = {
		type: "string",
		enum: enumOptions,
	}

	const isMulti = utils.getBoolAttribute(input, "multiple")

	const property = isMulti ? wrapSelectMulti(enumProperty) : enumProperty

	return [property, true]
}

function createElementSchema(input:TagElement): [OAPI.SchemaObject, boolean] {
	if (input.name === "select") {
		return createSelectSchema(input)
	} else {
		return createInputSchema(input)
	}
}

export
function createPostFormApiSchema(postForm:TagElement): OAPI.SchemaObject {
	const properties: OAPI.SchemaObject["properties"] = {}
	const required: OAPI.SchemaObject["required"] = []
	const inputSchema: OAPI.SchemaObject = {
		type: "object",
		properties,
		additionalProperties: false,
		required,
	}

	const formInputs = utils.findInputs(postForm)
	for (const input of formInputs) {
		const attributes = input.attributes || {}

		const name = attributes.name
		if (! name) {
			utils.error(input, "Unamed input")
		}
		if (typeof(name) !== "string") {
			utils.error(input, `Invalid input name ${name}`)
		}

		const [property, propRequired] = createElementSchema(input)
		
		properties[name] = property
		if (propRequired) {
			required.push(name)
		}
	}

	return inputSchema
}

export
function createPathParameters(path:string): OAPI.ParameterObject[] {
	const partsRaw = path.match(/:\w+/g) || []
	const parts = partsRaw.map((part) => part.replace(/^:/, ''))

	return parts.map((part) => ({
		in: "path",
		name: part,
		schema: { type:"string" },
		required: true,
		//description: "",
	}))
}

export
function expressToOapiPath(path:string): string {
	return path.replace(/:\w+/g, (p) => `{${p.substr(1)}}`)	
}

export
function createOpenApiSchema(doc:StarlingDocument): OAPI.OpenAPIObject {
	const title = doc.title || "Starling"
	
	const apiPaths: OAPI.OpenAPIObject["paths"] = {}
	const apiSpec: OAPI.OpenAPIObject = {
		openapi: "3.1.0",
		info: {
			title: title+" api",
			version: "1.0",
		},
		paths: apiPaths,
	}

	for (const form of doc.forms) {
		apiPaths[`/api${form.oapiPath}`] = {
			post: {
				operationId: form.name,
				parameters: form.parameters,
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
