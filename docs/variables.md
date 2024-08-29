# Variables

## Basics

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

Some tags can set or alter the current data-frame.

When setting key variables we don't use the `$` token as we can only set variables in the current frame.

Here is an example that uses `<v-json>` which parses it's body and sets the variable in the `target` attribute
```
<v-json target="foo" >
{ "bar":22 }
</v-json>

<!-- Now our frame is {"foo": { "bar":22 }} -->
```

We can also use `$` to set the current frame to a variable.
```
<v-json target="$" >
22
</v-json>

<!-- Now our frame is 22 -->
```

### Using variables

In vtml variables always cascade **down in inwards**. At the begining of our document we have what we call the `root-dataset` and each time we add new data or select existing data we create a new `data-frame`.

Take the following example:

```
<v-json target="foo" >22</v-json> <!-- Here we set $foo to 22 -->
<p>$foo</p>                       <!-- And here we use the variable -->
```

All is well as the variable foo was declared and then used in the next element.


We cannot use a variable before it is set.
```
<p>$foo</p>                         <!-- BAD: The variable has not been set yet -->
<v-json target="baz" >"Wut?"</v-json>
```


A variable cannot be used from a higher frame.
```
<div>                                    <!-- An ordinary div that will be rendered by the page -->
    <v-json target="bar" >"Woo"</v-json> <!-- Set $bar to "Woo" indide the div -->
    <p>$bar</p>                          <!-- OK: Here we can use the variable -->
</div>
<p>$bar</p>                        <!-- BAD: $bar was scoped to the div so we cannot see it now -->
```

Note that in the `<p>` tag, as with all other html tags, when we try to access an undefined variable we just get an empty string. So the above would render as `<p></p>`.

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

There are some exceptions to this rule around templating.


For `v-` tags you may need to refer to the [reference page](/reference) as some attributes and bodies can be templated and some can not. Also there are a few tags with special templating rules like [v-nodejs](/reference#v-nodejs).


**Warning**

There are some special cases around forms where the attributes cannot be templated.

Such as the name on inputs/switches `<input name="$foo" /> <!-- BAD: Cannot template name -->`
And the method of forms `<form method="$method" >...</form> <!-- BAD: Cannot template method -->`

See the [forms](/tutorial/forms) page for more information

### Cascading frames

When we try to access a variable and the returned value is undefined, the context then checks the frame before.

```
<v-json target="foo" >
"bar"
</v-json>
<!-- Now our frame is now { foo:"bar" } -->

<v-json target="$" >
22
</v-json>
<!-- Now our frame is 22 -->

$     <!-- This resolved as 22 -->
$foo  <!-- But we can still access the parent frames -->

```

In this way we can access any variables that our parent had access to **as long as they were not overrwitten**.


## Root dataset

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
| $.pageNotFound  | A special variable set when no other page matches  | false                   |

Root variables are always available by using the `$.` prefix on variables.

```
<p>Request path is $.path </p>
```

## Advanced

### Dereference keys

Variables can also be used as keys for other unrelated variables.

This allow for simple _lookup_ functionality.

```
<v-json target="calendar" >
    {
        "daysofweek": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        "entries": [
            { "dow":0, "weather":"Sunny" }
            { "dow":3, "weather":"Rainy" }
        ]
    }
</v-json>

<table>
    <thead>
        <tr><th>Day</th><th>Weather</th></tr>
    </thead>
    <tbody>
    <v-for-each source="$calendar.entries" > <!-- Loop through the entries -->
        <tr>
            <td>$daysofweek.$dow</td>        <!-- Here I'm using the dow var to key daysofweek -->
            <td>$weather</td>
        </tr>
    </v-for-each>
    </tbody>
</table>
```
