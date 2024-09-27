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

	expect(fnc).toThrow(`foo not defined in <string>:1`)
})

test("no error thrown when referencing root variable", async () => {
	
	const fnc = () => RenderTest(`
		$.path
	`)

	expect(fnc).not.toThrow()
})


test("variables can be escaped", async () => {
	const output = await RenderTest(`\\$foo`)

	expect(output).toBe(`$foo`)
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

test("redefining a variable throws an error", async () => {
	const testVtml = `
		<v-json target="$one" >1</v-json>
		<v-json target="$one" >2</v-json>
	`

	const fnc = () => RenderTest(testVtml)

	expect(fnc).toThrow(`one redefined in <string>:3`)
})
