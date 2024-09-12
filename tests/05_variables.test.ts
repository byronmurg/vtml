import {RenderTest} from "./test_lib"
import RootBlock from "../src/block/root_block"
import * as HTML from "../src/html"

test("basic variable references", async () => {
	
	const output = await RenderTest(`
		<v-json target="$foo" >"FOO"</v-json>
		$foo
	`)

	expect(output).toBe(`FOO`)
})

test("error thrown when undefined", async () => {
	
	const fnc = () => RenderTest(`
		$foo
	`)

	expect(fnc).toThrow(`foo not defined in <string>:#text(0)`)
})

test("no error thrown when referencing root variable", async () => {
	
	const fnc = () => RenderTest(`
		$.path
	`)

	expect(fnc).not.toThrow()
})


test("variables can be escaped", async () => {
	// @TODO should really replace with one slash
	
	const output = await RenderTest(`\\$foo`)

	expect(output).toBe(`\\$foo`)
})

test("variables can use bracket notation", async () => {
	const output = await RenderTest(`
		<v-json target="$foo" >"FOO"</v-json>
		$(foo).jpg
	`)

	expect(output).toBe(`FOO.jpg`)
})

test("javascript templates are unaffected", async () => {
	const output = await RenderTest('<v-json target="$foo" >"FOO"</v-json>${foo}.jpg')

	expect(output).toBe('${foo}.jpg')
})

test("references render in order", () => {
	const testVtml = `
		<v-json target="$one" >1</v-json>
		<v-json target="$two" >2</v-json>
		<v-nodejs target="$three" >return $one + $two</v-nodejs>
	`

	const html = HTML.parse(testVtml, "<test>")
	const root = new RootBlock(html)

	const description = root.getRenderDescription()

	expect(description).toMatchObject([
		{
			name: "v-json",
			seq: 0,
		},
		{
			name: "v-json",
			seq: 0,
		},
		{
			name: "v-nodejs",
			seq: 1,
		}	
	])
})
