import { XMLParser, XMLBuilder } from "fast-xml-parser"

const parsingOptions = {
	ignoreAttributes: false,
    attributeNamePrefix : "",

	preserveOrder: true,
	unpairedTags: ["hr", "br", "link", "meta", "input"],
	stopNodes : ["*.script", "*.style", "*.x-sql"],
	processEntities: true,
	htmlEntities: true,
	allowBooleanAttributes: true,
};

const parser = new XMLParser(parsingOptions);

export
type Element = {
	type: "element"|"text"
	name?: string
	attributes?: Record<string, string|boolean>
	elements?: Element[]
	text?: string
}

function toElement(jsObj:any): Element {
	const attrs = jsObj[":@"]
	delete jsObj[":@"]

	const keys = Object.keys(jsObj)
	if (keys.length > 1) {
		throw Error(`Unknown keys ${keys.join(",")}`)
	}

	const name = keys[0]

	let text;
	let children:Element[] = []

	if (name === "#text") {
		text = jsObj[name]

		return {
			type: "text",
			text,
		}

	} else {
		const childObjs = jsObj[name]
		children = childObjs.map(toElement)

		const el: Element = {
			type: "element",
			name,
			attributes: attrs,
			elements: children,
			text,
		}

		return el
	}
}


export
function parse(html:string): Element[] {
	const jsObj = parser.parse(html)
	return jsObj.map(toElement)
}


function toJsObj(el:Element): any {
	if (el.type === "text") {
		return {
			"#text": el.text,
		}
	} else {
		return {
			[el.name||""]: (el.elements || []).map(toJsObj),
			":@": el.attributes,
		}
	}
}

const builderOptions = {
	...parsingOptions,
	format: false,
};

const builder = new XMLBuilder(builderOptions);

export
function serialize(els:Element[]): string {
	const jObj = els.map(toJsObj)
	return builder.build(jObj);
}
