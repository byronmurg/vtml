import type { TagBlock } from "./types"
import type * as OAPI from "openapi3-ts/oas31"
import {matchInputs} from "./isolates/form"
import * as Vars from "./variables"
export type * from "openapi3-ts/oas31"

type InputSchema = {
	handled: true
	schema: OAPI.SchemaObject
	required: boolean
}

type NotHandled = { handled:false }

type SchemaResult = InputSchema|NotHandled

export
function toPattern(pattern:string) {
	// HTML input patterns do not need to specify start and end.
	return "^"+pattern+"$"
}

function createExoticFormat(input:TagBlock, format:string): SchemaResult {
	const required = input.boolAttr("required")
	
	const schema: OAPI.SchemaObject = {
		type: "string",
		format,
	}

	const maxLength = input.optNumAttr("maxlength") || input.optNumAttr("v-maxsize")
	if (maxLength) {
		schema.maxLength = maxLength
	}

	return {
		handled: true,
		schema, required
	}
}

function createStringInputSchema(input:TagBlock): SchemaResult {
	const required = input.boolAttr("required")

	let minLength = input.optNumAttr("minlength")

	if (required && !minLength) {
		minLength = 1
	}

	const schema: OAPI.SchemaObject = {
		type: "string",
		minLength,
	}

	const pattern = input.attr("pattern")
	if (pattern) {
		schema.pattern = toPattern(pattern)
	}

	const maxLength = input.optNumAttr("maxlength") || input.optNumAttr("v-maxsize")
	if (maxLength) {
		schema.maxLength = maxLength
	}
	

	return {
		handled: true,
		schema, required,
	}
}

function createBoolInputSchema(): SchemaResult {
	const schema: OAPI.SchemaObject = {
		type: "boolean",
	}
	return { schema, required:true, handled:true }
}

function createNumberInputSchema(input:TagBlock): SchemaResult {
	const schema: OAPI.SchemaObject = {
		type: "number"
	}

	const min = input.optNumAttr("min")
	if (min !== undefined) {
		schema.minimum = min
	}

	const max = input.optNumAttr("max")
	if (max !== undefined) {
		schema.maximum = max
	}

	const step = input.optNumAttr("step")
	if (step !== undefined) {
		schema.multipleOf = step
	}

	return { handled:true, schema, required:true }
}

function createInputSchema(input:TagBlock): SchemaResult {
	
	switch (input.attr("type")) {
		case "radio": // @NOTE Radios are handled elsewhere
		case "submit": // Don't need submits
		case "reset": // ...or resets
		case "button": // ...or buttons
		case "image": // ...or image
			return { handled:false }
		case "range":
		case "number":
			return createNumberInputSchema(input)
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
		case "file":
			return createExoticFormat(input, "binary")
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

function createSelectSchema(input:TagBlock): SchemaResult {

	const options = input.FindAll((child) => child.getName() === "option")
	const enumOptions: string[] = []

	for (const option of options) {
		const textEl = option.getOneTextChild()
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

	// If any of the enum options contains a template then
	// the select is considered dynamic and cannot be an enum
	const isDynamic = enumOptions.find((op) => {
		const vars = Vars.basicTemplate.findAllVars(op)
		return vars.all.length
	})

	const enumProperty: OAPI.SchemaObject = {
		type: "string",
		enum: isDynamic ? undefined: enumOptions,
	}

	// The format can be set by the tag itself.
	const format = input.attr("format")
	if (format) {
		enumProperty.format = format
	}

	const pattern = input.attr("pattern")
	if (pattern) {
		enumProperty.pattern = toPattern(pattern)
	}

	const maxLength = input.optNumAttr("maxlength") || input.optNumAttr("v-maxsize")
	if (maxLength) {
		enumProperty.maxLength = maxLength
	}


	const isMulti = input.boolAttr("multiple")

	const property = isMulti ? wrapSelectMulti(enumProperty) : enumProperty

	return {
		schema: property,
		required: true,
		handled: true
	}
}

function createElementSchema(input:TagBlock): SchemaResult {
	if (input.getName() === "select") {
		return createSelectSchema(input)
	} else {
		return createInputSchema(input)
	}
}

function matchRadio(block:TagBlock) {
	return (block.getName() === "input") && (block.attr("type") === "radio")
}

export default
function CreateFormInputSchema(postForm:TagBlock): OAPI.SchemaObject {

	const properties: OAPI.SchemaObject["properties"] = {}
	const requiredSet = new Set<string>()

	const formInputs = postForm.FindAll(matchInputs)

	for (const formInput of formInputs) {
		const name = formInput.attr("name")

		const inputSchema = createElementSchema(formInput)
		if (!inputSchema.handled) {
			continue
		}

		const {schema, required} = inputSchema

		properties[name] = schema
		if (required) {
			requiredSet.add(name)
		}
	}

	// Now do the radio buttons
	const radios:Record<string, Set<string>> = {}
	const radioInputs = postForm.FindAll(matchRadio)
	for (const input of radioInputs) {
		// We have already validated names.
		const name = input.attr('name')

		// If an option set for this radio group does not exist then
		// create one
		const options = radios[name] || (radios[name] = new Set())
		// Add the value to the option set
		const value = input.attr('value')
		options.add(value)

		// If any of the radios are required then they all are
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
		required: [...requiredSet], //@NOTE convert Set to array
	}

	return inputSchema
}
