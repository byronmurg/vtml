import StarlingDocument from "../src/document"
import {InitCtx} from "./test_lib"

function trimAll(str:string): string {
	return str.split("\n").map((s) => s.trim()).join("")
}

test("x-json", async () => {
	const ctx = InitCtx()

	const doc = StarlingDocument.LoadFromString(`
		<x-json target="foo" >21</x-json>
		<p>$foo</p>
	`)

	const output = await doc.renderLoaderMl(ctx)

	expect(trimAll(output)).toBe(`<p>21</p>`)
})

test("x-yaml", async () => {
	const ctx = InitCtx()

	const doc = StarlingDocument.LoadFromString(`
		<x-yaml target="$" src="./tests/test_assets/some.yml" />
		<p>$foo</p>
	`)

	const output = await doc.renderLoaderMl(ctx)

	expect(trimAll(output)).toBe(`<p>Bar</p>`)
})
