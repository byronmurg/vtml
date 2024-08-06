import StarlingDocument from "../src/document"
import type {TagElement} from "../src/html"
import {InitCtx} from "./test_lib"

// Just an example context
const ctx = InitCtx()

function trimAll(str:string): string {
	return str.split("\n").map((s) => s.trim()).join("")
}

test("x-include", async () => {

	const doc = StarlingDocument.LoadFromFile("./tests/test_assets/parent.html")

	const output = await doc.renderLoaderMl(ctx)

	expect(trimAll(output)).toBe(`<p>22</p>`)

	const expose = doc.root[1]

	expect(expose).toBeTruthy()
	expect(expose.type).toBe("element")
	expect((expose as TagElement).attributes.src).toBe("tests/test_assets/some.yml")
})
