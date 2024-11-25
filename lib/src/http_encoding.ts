import type {InputValue, BodyType, TagBlock} from "./types"

function simpleToTime(timeStr:string): string {
	// This function is neccesary due to the slightly different
	// ways that browsers can shorten "time" input values.
	//
	// They can come out as 
	// - 00:00
	// --- or ---
	// - 00:00:00

	if (timeStr.length < 6) {
		timeStr += ":00"
	}

	if (timeStr.length < 9) {
		timeStr += ".000"
	}

	return timeStr + "Z"
}

function parseFormInput(value:string, input:TagBlock): boolean|string|number {
	const type = input.attr("type")
	switch (type) {
		case "checkbox":
			return (value === "on")
		case "time":
			return simpleToTime(value)
		case "datetime-local":
			return value +":00.000Z"
		case "number":
		case "range":
			return parseFloat(value)
		default:
			return value
	}
}

function asArray(v:string|string[]): string[] {
	return Array.isArray(v)? v : [v]
}

function parseFormSelect(value:string, field:TagBlock): string|string[] {
	const isMulti = field.boolAttr("multiple")
	return isMulti ? asArray(value) : value
}

function parseFormField(value:string, field:TagBlock): InputValue {
	const name = field.getName()
	if (name === "input") {
		return parseFormInput(value, field)
	} else if (name === "select") {
		return parseFormSelect(value, field)
	} else {
		return value
	}
}

function parseFormFields(body:Record<string, string>, formFields:TagBlock[]): BodyType {
	const newBody: BodyType = {}

	for (const field of formFields) {
		const name = field.attr("name")
		if (! name) continue

		const value = body[name]
		newBody[name] = parseFormField(value, field)
	}

	return newBody
}

export default
function HttpEncParser(formFields:TagBlock[]) {
	return (body:Record<string, string>): BodyType => {
		return parseFormFields(body, formFields)
	}
}
