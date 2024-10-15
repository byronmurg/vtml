# Event streams

VTML has in-build support for SSE (Server-side events) via the <a class="link" href="/reference#v-subscribe" >&lt;v-subscribe&gt;</a> and <a class="link" href="/reference#v-notify" >&lt;v-notify&gt;</a> tags.

Rather than using named event channels VTML uses paths to distinguish between event streams.

In order to use event streams VTML must be started with the `EVENT_STREAM_URL` environment variable. Currently supported event queues are:

| Type | Prefix | Description | Example |
|------|--------|-------------|---------|
| Local | local | Just use an in-memory queue. Nice for testing but not scalable | local:// |
| Redis | redis | Use a redis pub/sub mechanism. | redis://user@pass@hostname:6379/1 |

Let's use an example.

```html
<v-subscribe path="/hello" />

<form v-name="say_hello" >
    <button type="submit" >Say hello</button>
    <v-action>
        <v-notify channel="/hello" message="Hello" />
    </v-action>
</form>
```

We can test this easily using `curl` to see the messages when we hit submit.

```bash
$ curl -i http://localhost:3000/hello
HTTP/1.1 200 OK
Cache-Control: no-cache
Content-Type: text/event-stream; charset=utf-8
Connection: keep-alive
Date: Tue, 15 Oct 2024 12:17:43 GMT
Transfer-Encoding: chunked

retry: 2000

event: notify
data: Hello

```

<a class="link" href="/reference#v-subscribe" >&lt;v-subscribe&gt;</a> is an _isolate_ meaning that the client must pass any v-checks that surround the tag.

In this example the `$user` variable must be defined for the client to both send and recieve messages.

```html
<v-check-authorized $user >
    <v-subscribe path="/hello" />

    <form v-name="say_hello" >
        <button type="submit" >Say hello</button>
        <v-action>
            <v-notify channel="/hello" message="Hello" />
        </v-action>
    </form>
</v-check-authorized>
```

