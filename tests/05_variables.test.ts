import {RenderTest} from "./test_lib"

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
