# Variables

### Syntax

Variables can be referenced with the `$` symbol.
```
{ "foo":"bar" }
$foo
```

If our variable is an object or an array we can dereference it with `.`.
```
{
    "foo":{
        "baz":"bar"
    }
}

$foo.baz
```


### Setting variables

Some tags can set variables to be used in subsequent tags.

Here is an example that uses `<v-json>` which parses it's body and sets the variable in the `target` attribute
```
<v-json target=$foo >
{ "bar":22 }
</v-json>

<p>foo.bar = $foo.bar</p>
```


### Using variables

In vtml variables always cascade **down and inwards**.

Take the following example:

```
<v-json target=$foo >22</v-json> <!-- Here we set $foo to 22 -->
<p>$foo</p>                       <!-- And here we use the variable -->
```

All is well as the variable foo was declared and then used in the next element.


We cannot use a variable before it is set.
```
<p>$foo</p>                         <!-- ERROR: The variable has not been set yet -->
<v-json target=$foo >"Wut?"</v-json>
```


A variable cannot be used from a higher frame.
```
<div>                                   <!-- An ordinary div that will be rendered by the page -->
    <v-json target=$bar >"Woo"</v-json> <!-- Set $bar to "Woo" indide the div -->
    <p>$bar</p>                         <!-- OK: Here we can use the variable -->
</div>
<p>$bar</p>                        <!-- ERROR: $bar was scoped to the div so we cannot see it now -->
```


### Where can I use variables

For all inbult HTML tags (and any tags not starting with v-) all attributes and the body can use variables.

e.g.
```
<div style="color:$color" >$name</div> <!-- Using both the $color and $name variables -->
```

**However** Attribute names can not be templated.
e.g.
```
<div $attr="color:red" ></div> <!-- BAD: Cannot template attribute name. No templating will happen -->
```

For `v-` tags you may need to refer to the [reference page](/reference) as some attributes and bodies can be templated and some can not. Also there are a few tags with special templating rules like [v-nodejs](/reference#v-nodejs).


**Warning**

There are some special cases around forms where the attributes cannot be templated.

Such as the name on inputs/switches `<input name="$foo" /> <!-- BAD: Cannot template name -->`
And the method of forms `<form method="$method" >...</form> <!-- BAD: Cannot template method -->`

See the [forms](/tutorial/forms) page for more information


## Root variables

Root variables are globaly available variables that describe the incoming request.

| Key             | Description                                        | Example                 |
|-----------------|----------------------------------------------------|-------------------------|
| $.path          | The currently requested path                       | /tutorial/variables     |
| $.matchedPath   | Which page (or root) was matched                   | /tutorial/:id           |
| $.params        | Any variables caught by the page string            | { id:"variables" }      |
| $.search        | The whole search string added to the url           | ?foo=bar                |
| $.query         | Search variables added to the url as an object     | { foo:"bar" }           |
| $.method        | The http verb used to request the page             | GET                     |
| $.body          | Request body when using form actions               | { newFoo:"bar" }        |
| $.headers       | All request headers (always lower case)            | { accept:"text/html" }  |
| $.cookies       | Any cookies sent by the client                     | { skey:"123" }          |

Root variables are always available by using the `$.` prefix on variables.

```
<p>Request path is $.path </p>
```
