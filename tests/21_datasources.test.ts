import VtmlDocument from "../src/document"
import {InitCtx} from "./test_lib"

function trimAll(str:string): string {
	return str.split("\n").map((s) => s.trim()).join("")
}

test("v-json", async () => {
	const ctx = InitCtx()

	const doc = VtmlDocument.LoadFromString(`
		<v-json target="$foo" >21</v-json>
		<p>$foo</p>
	`)

	const output = await doc.renderLoaderMl(ctx)

	expect(trimAll(output)).toBe(`<p>21</p>`)
})

test("v-yaml", async () => {
	const ctx = InitCtx()

	const doc = VtmlDocument.LoadFromString(`
		<v-yaml target="$data" src="./tests/test_assets/some.yml" />
		<p>$data.foo</p>
	`)

	const output = await doc.renderLoaderMl(ctx)

	expect(trimAll(output)).toBe(`<p>Bar</p>`)
})
