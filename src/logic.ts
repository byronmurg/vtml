import Debug from "debug"
import type {Element} from "./html"

const debug = Debug("starling:logic")


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

export default
function doesLogicSelectorMatch(value:any, attributes:Element["attributes"] = {}): boolean {

	// If the selector has any math operators then all of them must not conflict
	const hasMathOperator = !!LogicOperators.find((op) => attributes[op.key] != undefined)
	if (hasMathOperator) {
		const asNum = parseFloat(value)
		for (const op of LogicOperators) {
			const checkStr = attributes[op.key]
			if (checkStr !== undefined) {
				const check = parseFloat(checkStr.toString())
				if (! op.operation(asNum, check)) {
					return false
				}
			}
		}
		return true
	} else if (attributes.eq !== undefined) {
		// If 'eq' is specified then it must match the value as a string
		debug("test equality", value, attributes.eq)
		if (value === undefined) value = ""
		return value.toString() === attributes.eq
	} else {
		// Otherwise just return truthy
		return !!value
	}
}

