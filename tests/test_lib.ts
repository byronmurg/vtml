import type {RootDataset} from "../src/types"
import FilterContext from "../src/filter_context"

export
function InitCtx(init:Partial<RootDataset> = {}) {
	return FilterContext.Init({
		path: "/",
		matchedPath: "/",
		query: {},
		method: "GET",
		cookies: {},
		headers: {},
		params:{},
		pageNotFound: false,
		...init,
	})
}

