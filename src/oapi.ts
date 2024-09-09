import type { TagBlock } from "./types"
import type VtmlDocument from "./document"
import * as OAPI from "openapi3-ts/oas31"
import {matchInputs} from "./form"
export * from "openapi3-ts/oas31"

function createExoticFormat(input:TagBlock, format:string): [OAPI.SchemaObject, boolean] {
	const required = input.boolAttr("required")
	
	const property: OAPI.SchemaObject = {
		type: "string",
		format,
	}

	return [property, required]
}

function createStringInputSchema(input:TagBlock): [OAPI.SchemaObject, boolean] {
	const required = input.boolAttr("required")

	let minLength = input.optNumAttr("minLength")

	if (required && !minLength) {
		minLength = 1
	}

	const property: OAPI.SchemaObject = {
		type: "string",
		pattern: input.attr("pattern"),
		maxLength: input.optNumAttr("maxlength"),
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

function createInputSchema(input:TagBlock): [OAPI.SchemaObject, boolean]|undefined {
	
	switch (input.attr("type")) {
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

function createSelectSchema(input:TagBlock): [OAPI.SchemaObject, boolean] {
	const options = input.FindAll((child) => child.getName() === "option")
	const enumOptions: string[] = []

	for (const option of options) {
		const el = option.element()
		const nElements = el.elements.length
		if (nElements > 1) {
			option.error("Too many children")
		}

		const textEl = option.requireOneTextChild()
		const value = option.attr("value")
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

	const isMulti = input.boolAttr("multiple")

	const property = isMulti ? wrapSelectMulti(enumProperty) : enumProperty

	return [property, true]
}

function createElementSchema(input:TagBlock): [OAPI.SchemaObject, boolean]|undefined {
	if (input.getName() === "select") {
		return createSelectSchema(input)
	} else {
		return createInputSchema(input)
	}
}



export
function createPostFormApiSchema(postForm:TagBlock): OAPI.SchemaObject {

	const properties: OAPI.SchemaObject["properties"] = {}
	const requiredSet = new Set<string>()

	const formInputs = postForm.FindAll(matchInputs)
	for (const input of formInputs) {
		const name = input.attr("name")

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
		if (input.getName() !== "input") continue
		if (input.attr("type") !== "radio") continue

		const name = input.attr("name")
		const options = radios[name] || (radios[name] = new Set())
		const value = input.attr('value')
		options.add(value)

		if (input.boolAttr("required")) {
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
function createOpenApiSchema(doc:VtmlDocument): OAPI.OpenAPIObject {
	const title = doc.title || "Vtml"
	
	const apiPaths: OAPI.OpenAPIObject["paths"] = {}
	const apiSpec: OAPI.OpenAPIObject = {
		openapi: "3.1.0",
		info: {
			title: title+" api",
			version: "1.0",
		},
		paths: apiPaths,
		components: {
			schemas: {
				"error": {
					title: "Error",
					type: "object",
					properties: {
						code: { type:"number" },
						message: { type:"string" },
					},
				}
			}
		},
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
				},
				responses: {
					"200": {
						description: "Successful operation",
					},
					"400": {
						description: "Invalid input",
						content: {
							"application/json": {
						  		schema: { $ref:"#/components/schemas/error" }
							}
						},
					},
					"401": {
						description: "Unauthorized",
						content: {
							"application/json": {
						  		schema: { $ref:"#/components/schemas/error" }
							}
						},
					},
					"403": {
						description: "Forbidden",
						content: {
							"application/json": {
						  		schema: { $ref:"#/components/schemas/error" }
							}
						},
					},
					"404": {
						description: "Target not found",
						content: {
							"application/json": {
						  		schema: { $ref:"#/components/schemas/error" }
							}
						},
					},
					// @TODO rest of these
				}
			}
		}
	}

	return apiSpec
}
