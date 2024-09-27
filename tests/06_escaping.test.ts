import {RenderTest} from "./test_lib"

test("text blocks remove escape", async () => {
	
	const output = await RenderTest(`<p>\\$money</p>`)

	expect(output).toBe("<p>$money</p>")
})

test("text blocks remove escape when variable is defined", async () => {
	
	const output = await RenderTest(`
		<v-json target=$money >22</v-json>
		<p>\\$money $money</p>
	`)

	expect(output).toBe("<p>$money 22</p>")
})

test("attribute removes escape", async () => {
	
	const output = await RenderTest(`<p class="\\$color" >hi</p>`)

	expect(output).toBe(`<p class="$color">hi</p>`)
})

test("escapes can be escaped", async () => {
	
	const output = await RenderTest(`
		<v-json target=$money >22</v-json>
		<p>\\\\$money \\$money $money</p>
	`)

	expect(output).toBe("<p>\\22 $money 22</p>")
})
