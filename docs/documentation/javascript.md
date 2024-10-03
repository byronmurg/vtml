# Javascript

## Server side

At any point in a VTML document you can include some Javascript logic.

The only tag you need is <a class="link" href="/reference#v-nodejs" >&lt;v-nodejs&gt;</a>

```html
<v-nodejs target=$number >
    return 1 + 2
</v-nodejs>
<p>$number</p>
```
In this example we set `1+2` to the variable `$number` then render it further down.

### importing

If you want to include some a seperate javascript file or module you can use the `import` attribute.

You still need to supply a `$target` attribute which is where the exports will be set.

Inlined <a class="link" href="/reference#v-nodejs" >&lt;v-nodejs&gt;</a> tags are always executed for every request, but any file `import`ed is only run once!

```html
<v-nodejs $target import="node:path" />

<v-nodejs target=$my_path >
    return $path.join("foo", "bar", "baz")
</v-nodejs>
```


## Client side

In VTML script tags can use variables set on the server.

!!! Be warned that variables are templates as JSON !!!

```html
<v-nodejs target=$number >
    return 1 + 2
</v-nodejs>
<script>
    // This will log on the client
    console.log($number)
</script>
```

Because variables are templated as JSON it's a good idea to set them to a variable first.

```html
<v-nodejs target=$obj >
    return { some:"object" }
</v-nodejs>
<script>
    let obj = $obj
    console.log(obj.some)
</script>
```

Bracket variable notation cannot be in `<script>` tags.

This means that client libraries such as jQuery will work as expected.

```javascript
console.log($(notgood))
```

If you need to use the `$` symbol for any other reason you must escape it with a `\` character.

```javascript
console.log(`I like \$money`)
```
