# Forms

Creating server-side interactions is as simple as creating a <a class="link" href="/reference#form" >&lt;form&gt;</a>.

Whenever we define a form with `v-name="name-here"` we automatically create the server-side routes.

Let's start with an example.
```html
<html>
  <head>
    <title>Say hi example</title>
  </head>
  <body>

    <form v-name="say_hi" >
      <input name="myname" type="text" placeholder="Your name is..." />

      <v-action>
        <v-nodejs>
          console.log("Hello", $.body.myname)
        </v-nodejs>
      </v-action>

      <button type="submit" >Greet</button>
    </form>
  </body>
</html>
```

This will display a small <a class="link" href="/reference#form" >&lt;form&gt;</a> with one text input and a button. When the user clicks the button and submits the <a class="link" href="/reference#form" >&lt;form&gt;</a> a message will be displayed on the server console.

## Validation

To add validation on input fields we just need to add the corresponding HTML attributes.

```html
<input name="myname" maxlength="64" required />
```

In this case for our "myname" field we are specifying that the field is required and must be at most 64 characters in length and is a required field.

## Api

In Addition to creating the formencoding and ajax routes we also create a json api and an OAPI schema definition.

By default an OAPI helper page is displayed at `/_api/` when running your app.

You can also see the schema itself at `/_api/_schema.json`.

```json
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


| Prefix  | Description                         | Input type        | Output                  |
|---------|-------------------------------------|-------------------|-------------------------|
| /       | The default form behaviour          | v-formencoded     | Redirect back           |
| /\_ajax | For perfoming isolated actions      | v-formencoded     | Render only form action |
| /\_api  | Only machine input                  | application/json  | See API output          |


Here's an example using HTMX to handle the ajax.

```
<form
    v-name="update_text"
    v-ajax
	hx-trigger="focusout"
    hx-post="/_ajax/update_text"
>
    ...
    <input type="text" value="$.body.text" />
</form>
```

There's alot here so let's break it down

The basic attributes
- v-name: We always need an v-name.

And some HTMX specific ones which I will give a brief explanation of.
- hx-trigger: Trigger on a focusout event (when the focus leaves this form)
- hx-post: POST to this address.

Finally there is the `v-ajax` attribute which disabled the usual added attributes.

### GET forms

Vtml only searches for forms with an v-name attribute. Therefore if we want to create a GET form that just adds search parameters to the url we can just omit the `v-name` attribute.

```html
<form>
  <input name="q" />
</form>

<v-sql target=$todos >
  -- I'm being a bit lazy here and having the DB check if q is null
  SELECT * FROM todos WHERE $.search.q IS NULL OR text LIKE $.search.q
</v-sql>

<v-for-each $todos >
  ...
</v-for-each>
```


### Using page parameters

Any page parameter can be used by referencing the **$.params** root variable.

```html
<v-page path="/todos/:id" >
  <form v-name="update_text" >
    <input type="text" maxlength="128" required />

    <button type="submit" >Update</button>

    <v-action>
      <v-sql>
        UPDATE todos SET text = $.body.text WHERE id = $.params.id
      </v-sql>
    </v-action>
  </form>
</v-page>
```

When setting the action path yourself you must include any containing paths.

```html
<v-page path="/todos/:id" >
  <form
    v-name="update_todo_text"
    action="/todos/:id/update_text"
  >
   ...
  </form>
</v-page>
```

### API output

By default, when calling a form api endpoint only the status code id returned.
```json
{
    "code": 200
}
```

If you want your api to return more meaningful data you can add a <a class="link" href="/reference#v-output" >&lt;v-output&gt;</a> containing the jsonschema of the output and the variableto send.

For example
```html
<form v-name="create_person" >
  <input name="new_name" required />

  <v-action>
    <v-sql target=$new_person single-row >
      -- Insert a new person and return the new row
      INSERT INTO people (name) VALUES ($.body.new_name) RETURNING id, name;
    </v-sql>

    <v-output $new_person >
      {
        "title": "Person",
        "type": "object",
        "properties": {
          "id": { "type":"number" },
          "name": { "type":"string" }
        }
      }
    </v-output>
  </v-action>
</form>
```


## Input jsonschema translation

In order to properly explain how the HTML inputs correlate to jsonschema types let's look at some Examples.

### Text inputs

```html
<input
    maxlength="64"
    minlength="3"
    pattern="\S+"
/>
```

```json
{
    "type":"string",
    "maxLength": 64,
    "minLength": 3,
    "pattern": "^\S+$",
}
```

### Select
```html
<select>
    <option>Foo</option>
    <option value="bar" >Bar</option>
</select> 
```

```json
{ "type":"string", "enum":["Foo", "bar"] } |
```

### Checkbox

```html
<input type="checkbox" />
```

```json
{
    "type": "boolean"
}
```
