import RedisEventStream from "../src/event_stream/redis"

// Regression test for a crash where node-redis emits "error" for connection
// problems independently of any in-flight command; without a listener that's
// an unhandled event and takes the whole process down. Point at a port
// nothing listens on so connection genuinely fails - no live redis needed.
const BAD_URL = new URL("redis://127.0.0.1:1")

function attachCrashDetectors() {
	let crashed: Error | undefined
	const onUncaught = (err: Error) => { crashed = err }
	process.on("uncaughtException", onUncaught)
	return {
		detach: () => process.off("uncaughtException", onUncaught),
		wasCrashed: () => crashed,
	}
}

test("a failing connection doesn't crash the process", async () => {
	const { detach, wasCrashed } = attachCrashDetectors()

	const stream = new RedisEventStream(BAD_URL)

	await new Promise((resolve) => setTimeout(resolve, 300))

	// Stop the retry/reconnect timers so the process (and jest) can exit.
	await stream.client.disconnect().catch(() => undefined)

	detach()
	expect(wasCrashed()).toBeUndefined()
})

test("a subscriber connection failure doesn't crash the process either", async () => {
	const { detach, wasCrashed } = attachCrashDetectors()

	const stream = new RedisEventStream(BAD_URL)
	const subscriber = stream.connectClient("some-channel")

	await new Promise((resolve) => setTimeout(resolve, 300))

	subscriber.disconnect()
	await stream.client.disconnect().catch(() => undefined)

	detach()
	expect(wasCrashed()).toBeUndefined()
})
