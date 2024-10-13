import type EventStream from "./interface"
import type {EventStreamConnection} from "./interface"
import EventEmitter from "node:events"

export default
class LocalEventStream implements EventStream {
	emitter: EventEmitter
	constructor() {
		this.emitter = new EventEmitter()
	}

	isConnected() {
		return true
	}

	sendMessage(channel:string, message:string) {
		this.emitter.emit(channel, message)
	}

	connectClient(channel:string): EventStreamConnection {
		const emitter = this.emitter
		const localEmitter = new EventEmitter()
		const localCallback = (message:string) => localEmitter.emit("message", message)
		emitter.on(channel, localCallback)
		return {
			onMessage(cbk:(message:string) => void) {
				localEmitter.on("message", cbk)
			},
			disconnect() {
				emitter.off(channel, localCallback)
			}
		}
	}
}

