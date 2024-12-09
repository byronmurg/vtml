import {RenderTest} from "./test_lib"

test("v-json", async () => {
	const output = await RenderTest(`
		<v-json target="$foo" >21</v-json>
		<p>$foo</p>
	`)

	expect(output).toBe(`<p>21</p>`)
})

test("v-yaml", async () => {
	const output = await RenderTest(`
		<v-yaml target="$data" src="./tests/test_assets/some.yml" />
		<p>$data.foo</p>
	`)

	expect(output).toBe(`<p>Bar</p>`)
})
