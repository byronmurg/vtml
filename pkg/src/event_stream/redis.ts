import type EventStream from "./interface"
import type {EventStreamConnection} from "./interface"
import {createClient} from "redis"

// node-redis emits "error" for connection problems (dropped connections,
// failed reconnects, etc) independently of any in-flight command. Without a
// listener this is an unhandled event and crashes the process - and
// .connect() rejecting unawaited/uncaught would too.
type RedisClient = ReturnType<typeof createClient>
function guardClient(client:RedisClient, label:string) {
	client.on("error", (err) => console.error(label, "error", err))
}

export default
class RedisEventStream implements EventStream {

	client: RedisClient

	constructor(private url:URL) {
		// Deliberately no custom reconnectStrategy: the default retries
		// forever with backoff and never rejects connect(), which is what
		// makes the bare, uncaught calls below safe. A bounded strategy
		// would make connect() reject on final failure and need catching -
		// don't add one without revisiting that.
		this.client = createClient({url:this.url.href})
		this.client.connect()
		guardClient(this.client, "client")
	}

	isConnected() {
		return true
	}

	connectClient(channel:string): EventStreamConnection {
		const client = this.client.duplicate()
		client.connect()
		guardClient(client, "subscriber")

		return {
			onMessage(cbk:(mgs:string) => void) {
				// subscribe() returns a promise that rejects if the client
				// disconnects while it's in flight (routine - e.g. the SSE
				// client closing its tab right after connecting). Uncaught,
				// that crashes the process the same way the bare .connect()
				// calls above did.
				client.subscribe(channel, cbk).catch((err) => console.error("subscriber", "subscribe error", err))
			},
			disconnect: () => client.disconnect()
		}
	}

	sendMessage(channel:string, message:string): void {
		this.client.publish(channel, message)
	}
}

