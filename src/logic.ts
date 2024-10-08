import type {TagElement} from "./html"
import Debug from "debug"
import {toNumber} from "./utils"

const debug = Debug("vtml:logic")

type LogicOperator = {
	key: string
	operation: (source:number, check:number) => boolean
}

const LogicOperators: LogicOperator[] = [
	{ key: "lt", operation: (source, check) => source < check },
	{ key: "lte", operation: (source, check) => source <= check },
	{ key: "gt", operation: (source, check) => source > check },
	{ key: "gte", operation: (source, check) => source >= check },
]

const hasMathOperator = (attributes:TagElement["attributes"]) =>
	!!LogicOperators.find((op) => attributes[op.key] != undefined)

function checkAllMathOperators(value:unknown, attributes:TagElement["attributes"]) {
	// All math operations work on numbers
	const asNum = toNumber(value)

	// Just return false if NaN
	if (isNaN(asNum)) {
		return false
	}

	// Loop through the operators
	for (const op of LogicOperators) {
		// Get the check string
		const checkStr = attributes[op.key]
		// Skip if not defined
		if (checkStr !== undefined) {

			// We need the check itself as a number also
			const check = toNumber(checkStr)

			// If the operations fails, break with false
			if (! op.operation(asNum, check)) {
				debug("failed check", op.key, asNum, check)
				return false
			}
		}
	}
	return true
}

export default
function doesLogicSelectorMatch(value:unknown, attributes:TagElement["attributes"] = {}): boolean {

	// If the selector has any math operators then all of them must not conflict
	if (hasMathOperator(attributes)) {
		return checkAllMathOperators(value, attributes)
	} else if (attributes['eq'] !== undefined) {
		// If 'eq' is specified then it must match the value as a string
		if (value === undefined) value = ""
		const str = `${value}`
		return str === attributes['eq']
	} else {
		// Otherwise just return truthy
		return !!value
	}
}

