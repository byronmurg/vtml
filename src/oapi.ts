import type { TagElement } from "./html"
import type StarlingDocument from "./document"
import * as OAPI from "openapi3-ts/oas31"
import * as utils from "./utils"
export * from "openapi3-ts/oas31"

function createExoticFormat(input:TagElement, format:string): [OAPI.SchemaObject, boolean] {
	const required = utils.getBoolAttribute(input, "required")
	
	const property: OAPI.SchemaObject = {
		type: "string",
		format,
	}

	return [property, required]
}

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

function createInputSchema(input:TagElement): [OAPI.SchemaObject, boolean]|undefined {
	
	switch (utils.getAttribute(input, "type")) {
		case "radio": // @NOTE Radios are handled elsewhere
		case "submit": // Don't need submits
		case "reset": // ...or resets
		case "button": // ...or buttons
			return undefined
		case "range":
		case "number":
			return createNumberInputSchema()
		case "email":
			return createExoticFormat(input, "email")
		case "date":
			return createExoticFormat(input, "date")
		case "url":
			return createExoticFormat(input, "uri")
		case "time":
			return createExoticFormat(input, "time")
		case "datetime-local":
			return createExoticFormat(input, "date-time")
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

function createElementSchema(input:TagElement): [OAPI.SchemaObject, boolean]|undefined {
	if (input.name === "select") {
		return createSelectSchema(input)
	} else {
		return createInputSchema(input)
	}
}

export
function createPostFormApiSchema(postForm:TagElement): OAPI.SchemaObject {

	const properties: OAPI.SchemaObject["properties"] = {}
	const requiredSet = new Set<string>()

	const formInputs = utils.findInputs(postForm)
	for (const input of formInputs) {
		const name = utils.requireAttribute(input, "name")

		const schemaParts = createElementSchema(input)

		if (!schemaParts) {
			continue
		}

		const [property, propRequired] = schemaParts
		
		properties[name] = property
		if (propRequired) {
			requiredSet.add(name)
		}
	}

	// Now do the radio buttons
	const radios:Record<string, Set<string>> = {}
	for (const input of formInputs) {
		if (input.name !== "input") continue
		if (utils.getAttribute(input, "type") !== "radio") continue

		const name = utils.requireAttribute(input, "name")
		const options = radios[name] || (radios[name] = new Set())
		const value = utils.requireAttribute(input, 'value')
		options.add(value)

		if (utils.getBoolAttribute(input, "required")) {
			requiredSet.add(name)
		}
	}

	for (const name in radios) {
		const options = radios[name]

		properties[name] = {
			type: "string",
			enum: [...options]
		}
	}

	const inputSchema: OAPI.SchemaObject = {
		type: "object",
		properties,
		additionalProperties: false,
		required: [...requiredSet],
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
