import type {RootDataset} from "../src/types"
import FilterContext from "../src/filter_context"

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
