import type {RootDataset, Block, ValidationError} from "../src/types"
import RootBlock from "../src/block/root_block"
import FilterContext from "../src/filter_context"
import * as HTML from "../src/html"
import VtmlDocument from "../src/document"

export
function InitCtx(init:Partial<RootDataset> = {}) {
	return FilterContext.Init(InitRoot(init))
}

export
function InitRoot(init:Partial<RootDataset> = {}): RootDataset {
	return {
		path: "/",
		matchedPath: "/",
		query: {},
		method: "GET",
		cookies: {},
		headers: {},
		params:{},
		action: false,
		...init,
	}
}

export
function trimAll(str:string): string {
	return str.split("\n").map((s) => s.trim()).join("")
}

export
function InitDocument(html:string): VtmlDocument {
	const initRes = VtmlDocument.LoadFromString(html)

	if (!initRes.ok) {
		throw Error(initRes.errors[0].message)
	}

	const doc = initRes.result
	return doc
}

export
function InitRootBlock(html:string): Block {
	const elements = HTML.parse(html, "<test_string>")
	const initRes = RootBlock.Init(elements)

	if (!initRes.ok) {
		throw Error(initRes.errors[0].message)
	}

	return initRes.result
}

export
async function RenderTest(html:string, root:Partial<RootDataset> = {}): Promise<string> {
	const rootDataset = InitRoot(root)
	const ctx = FilterContext.Init(rootDataset)
	const initRes = VtmlDocument.LoadFromString(html)

	if (!initRes.ok) {
		throw Error(initRes.errors[0].message)
	}

	const doc = initRes.result

	const output = await doc.renderLoaderMl(ctx)
	return trimAll(output)
}

export
async function RenderTestFile(filename:string, root:Partial<RootDataset> = {}): Promise<string> {
	const rootDataset = InitRoot(root)
	const ctx = FilterContext.Init(rootDataset)
	const initRes = VtmlDocument.LoadFromFile(filename)

	if (!initRes.ok) {
		throw Error(initRes.errors[0].message)
	}

	const doc = initRes.result

	const output = await doc.renderLoaderMl(ctx)
	return trimAll(output)
}

export
function RenderErrors(html:string): ValidationError[] {
	const initRes = VtmlDocument.LoadFromString(html)

	if (initRes.ok) {
		return []
	} else {
		return initRes.errors
	}
}
