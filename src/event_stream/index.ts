import {URL} from "url"
import type EventStream from "./interface"
import DummyEventStream from "./dummy"
import LocalEventStream from "./local"

function Initialize(): EventStream {
	const EVENT_STREAM_URL = process.env["EVENT_STREAM_URL"]

	if (! EVENT_STREAM_URL) {
		return new DummyEventStream()
	}

	const esUrl = new URL(EVENT_STREAM_URL)

	switch (esUrl.protocol) {
		case "local:":
			return new LocalEventStream()
		default:
			throw Error(`Unknown event_stream type ${esUrl.protocol}`)
	}
}

const eventStream: EventStream = Initialize()
export default eventStream