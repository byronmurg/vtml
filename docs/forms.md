# Forms

Creating server-side interactions is as simple as creating a form.

Whenever we define a form with `x-name="name-here"` we automatically create the server-side routes.

Let's start with an example.
```
<html><body>
    <title>Say hi example</title>

    <form x-name="say_hi" >
        <input name="myname" type="text" placeholder="Your name is..." />

        <x-nodejs-action>
            console.log("Hello", $.body.myname)
        </x-nodejs-action>

        <button type="submit" >Greet</button>
    </form>
</body></html>
```

This will display a small form with one text input and a button. When the user clicks the button and submits the form a message will be displayed on the server console.

## Validation

To add validation on input fields we just need to add the corresponding HTML attributes.

```
<input name="myname" maxlength="64" required />
```
In this case for our "myname" field we are specifying that the field is required and must be at most 64 characters in length and is a required field.

## Api

In Addition to creating the formencoding and ajax routes we also create a json api and an OAPI schema definition.

By default an OAPI helper page is displayed at `/api-docs/` when running your app.

You can also see the schema itself at `/api/_schema.json`.

form

```
{
  "openapi": "3.1.0",
  "info": {
    "title": "Say hi example",
    "version": "1.0"
  },
  "paths": {
    "/api/say_hi": {
      "post": {
        "operationId": "say_hi",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "myname": {
                    "type": "string",
                    "maxLength": 64,
                    "minLength": 1
                  }
                },
                "additionalProperties": false,
                "required": ["myname"]
              }
            }
          }
        }
      }
    }
  }
}
```



## Ajax and other request types


| Prefix            | Description                         | Input type        | Output                |
|-------------------|-------------------------------------|-------------------|-----------------------|
| /action           | The default form behaviour          | x-formencoded     | Re-renders whole page |
| /ajax             | For perfoming isolated actions      | x-formencoded     | Render only form      |
| /api              | Only machine input                  | application/json  | None                  |


Here's an example using HTMX to handle the ajax.

```
<form
    x-name="update_text"
    x-ajax
	hx-trigger="focusout"
    hx-post="$__form_ajax"
>
    ...
    <input type="text" value="$.body.text" />
</form>
```

There's alot here so let's break it down

The basic attributes
- x-name: We always need an x-name.

And some HTMX specific ones which I will give a brief explanation of.
- hx-trigger: Trigger on a focusout event (when the focus leaves this form)
- hx-post: POST to this address. We're using `$__form_ajax` which is a special variable attached to all forms. It simply resolves to the ajax route which in this case would be `/ajax/update_text`.

Finally there is the `x-ajax` attribute which disabled the usual added attributes.

### GET forms

Starling only searches for forms with an x-name attribute. Therefore if we want to create a GET form that just adds search parameters to the url we can just omit the `x-name` attribute.

```
<form>
    <input name="q" />
</form>

<x-sql target="todos" >
    -- I'm being a bit lazy here and having the DB check if q is null
    select * from todos where $.search.q is null or text like $.search.q
</x-sql>

<x-for-each source="todos" >
    ...
</x-for-each>
```


### Using page parameters

Any page parameter can be used by referencing the `params` root variable.

```
<x-page path="/todos/:id" >
    <form x-name="update_text" >
        <x-sql-action>
            update todos set text = $.body.text where id = $.params.id
        </x-sql-action>

        <input type="text" maxlength="128" required />

        <button type="submit" >Update</button>
    </form>
</x-page>
```


## Input jsonschema translation

In order to properly explain how the HTML inputs correlate to jsonschema types let's look at some Examples.

### Text inputs

```
<input
    maxlength="64"
    minlength="3"
    pattern="\S="
/>
```

```
{
    "type":"string",
    "maxLength": 64,
    "minLength": 3,
    "pattern": "\S+",
}
```

### Select
```
<select>
    <option>Foo</option>
    <option value="bar" >Bar</option>
</select> 
```

```
{ "type":"string", "enum":["Foo", "bar"] } |
```

### Checkbox

```
<input type="checkbox" />
```

```
{
    "type": "boolean"
}
```



