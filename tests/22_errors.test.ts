import {InitDocument, InitCtx} from "./test_lib"

test("nothing renders when no error is set", async () => {
	const ctx = InitCtx()
	const exampleHTML = `
		<v-try>
			<v-nodejs>return "woop";</v-nodejs>
		</v-try>
		<v-catch>
			<p>$error.message</p>
		</v-catch>
	`

	const doc = InitDocument(exampleHTML)
	const res = await doc.renderLoaderMl(ctx)

	expect(res).toBe("")
})

test("error is set", async () => {
	const ctx = InitCtx()
	const exampleHTML = `
		<v-try>
			<v-nodejs>throw Error("Hi")</v-nodejs>
		</v-try>
		<v-catch>
			<p>$error.message</p>
		</v-catch>
	`

	const doc = InitDocument(exampleHTML)
	const res = await doc.renderLoaderMl(ctx)

	expect(res).toBe("<p>Internal Server Error</p>")
})
