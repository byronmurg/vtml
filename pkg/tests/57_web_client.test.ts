import type Express from "express"
import WebClient from "../src/web/web_client"

function fakeReqRes() {
	const req = { get: () => undefined } as unknown as Express.Request
	const res = {} as Express.Response
	return { req, res }
}

test("safeReferer falls back to / when there's no Referer header", () => {
	const { req, res } = fakeReqRes()
	const client = new WebClient(req, res)

	expect(client.safeReferer).toBe("/")
})

test("safeReferer returns the referer's pathname when present", () => {
	const req = { get: () => "https://example.com/some/path?x=1" } as unknown as Express.Request
	const res = {} as Express.Response
	const client = new WebClient(req, res)

	expect(client.safeReferer).toBe("/some/path")
})

test("safeReferer falls back to / for an unparseable referer", () => {
	const req = { get: () => "not-a-valid-url" } as unknown as Express.Request
	const res = {} as Express.Response
	const client = new WebClient(req, res)

	expect(client.safeReferer).toBe("/")
})

test("Wrap passes a synchronous throw to next instead of letting it escape", () => {
	const { req, res } = fakeReqRes()
	const next = jest.fn()

	const wrapped = WebClient.Wrap(() => {
		throw new Error("sync boom")
	})

	wrapped(req, res, next)

	expect(next).toHaveBeenCalledWith(expect.any(Error))
})

test("Wrap passes a rejected promise to next instead of crashing", async () => {
	const { req, res } = fakeReqRes()
	const next = jest.fn()

	const wrapped = WebClient.Wrap(async () => {
		throw new Error("async boom")
	})

	wrapped(req, res, next)

	await new Promise((resolve) => setImmediate(resolve))

	expect(next).toHaveBeenCalledWith(expect.any(Error))
})
