import VtmlDocument from "../src/document"
import {InitCtx} from "./test_lib"

// Just an example context
const ctx = InitCtx()

function trimAll(str:string): string {
	return str.split("\n").map((s) => s.trim()).join("")
}

test("v-include", async () => {

	const doc = VtmlDocument.LoadFromFile("./tests/test_assets/parent.html")

	const output = await doc.renderLoaderMl(ctx)

	expect(trimAll(output)).toBe(`<p>22</p>`)
})
