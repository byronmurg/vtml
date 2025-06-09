import {RenderTest} from "./test_lib"

test("script empty as normal", async () => {
	const exampleHTML = `
		<v-json target="$foo" >[1,2,3]</v-json>
		<script src="thing.js" />
	`

	const fooOut = await RenderTest(exampleHTML)

	expect(fooOut).toBe(`<script src="thing.js"></script>`)
})

test("script basic binding", async () => {
	const exampleHTML = `
		<v-json target="$foo" >22</v-json>
		<script>let f = $foo</script>
	`

	const fooOut = await RenderTest(exampleHTML)
	expect(fooOut).toBe(`<script>let f = 22</script>`)
})

test("script complex binding", async () => {
	const exampleHTML = `
		<v-json target="$foo" >[1,2,3]</v-json>
		<script>let f = $foo</script>
	`

	const fooOut = await RenderTest(exampleHTML)
	expect(fooOut).toBe(`<script>let f = [1,2,3]</script>`)
})

test("script jQuery style variables", async () => {
	const exampleHTML = `
		<script>
			$('#foo').hide()
		</script>
	`

	const fooOut = await RenderTest(exampleHTML)
	expect(fooOut).toBe(`<script>$('#foo').hide()</script>`)
})
