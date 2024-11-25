import type EventStream from "./interface"
import type {EventStreamConnection} from "./interface"
import {createClient} from "redis"

export default
class RedisEventStream implements EventStream {
	
	client: ReturnType<typeof createClient>

	constructor(private url:URL) {
		this.client = createClient({url:this.url.href})
		this.client.connect()
	}

	isConnected() {
		return true
	}

	connectClient(channel:string): EventStreamConnection {
		const client = this.client.duplicate()
		client.connect()

		return {
			onMessage(cbk:(mgs:string) => void) {
				client.subscribe(channel, cbk)
			},
			disconnect: () => client.disconnect()
		}
	}

	sendMessage(channel:string, message:string): void {
		this.client.publish(channel, message)
	}
}

