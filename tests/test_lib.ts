import type {RootDataset} from "../src/types"
import FilterContext from "../src/filter_context"
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
function RenderTest(html:string, root:Partial<RootDataset> = {}) {
	const rootDataset = InitRoot(root)
	const ctx = FilterContext.Init(rootDataset)
	const doc = VtmlDocument.LoadFromString(html)
	return doc.renderLoaderMl(ctx)
		.then(trimAll)
}
