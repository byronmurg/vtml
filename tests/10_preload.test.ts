import VtmlDocument from "../src/document"
import {InitCtx, trimAll} from "./test_lib"

// Just an example context
const ctx = InitCtx()


test("v-include", async () => {

	const doc = VtmlDocument.LoadFromFile("./tests/test_assets/parent.html")

	const output = await doc.renderLoaderMl(ctx)

	expect(trimAll(output)).toBe(`<p>22</p>`)
})
