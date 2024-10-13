import type EventStream from "./interface"
import type {EventStreamConnection} from "./interface"

export default
class DummyEventStream implements EventStream {
	isConnected() {
		return false
	}

	connectClient(): EventStreamConnection {
		throw Error(`Connecting dummy client`)
	}

	sendMessage(): void {
		throw Error(`Sending message to dummy client`)
	}
}

