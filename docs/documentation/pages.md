# Pages

VTML allow us to create multiple pages within out website.

The only tag for creating pages is <a class="link" href="/reference#v-page" >&lt;v-page&gt;</a>.

When the loader reaches an <a class="link" href="/reference#v-page" >&lt;v-page&gt;</a> tag it will only display if the path matches the current request.


For example:
```html
<html>

  <header>
    <h1>Title</h1>   <!-- This will always be displayed -->
  </header>

  <v-page path="/tutorial" >
    I'm the tutorial page
  </v-page>

  <v-page path="/reference" >
    I'm the reference page
  </v-page>

</html>
```

If pages are nested then the **full path** must be used on all subsequent pages.

```html
<v-page path="/tutorial" >
  <h3>Tutorial</h3>

  <v-page path="/tutorial/pages" >
    <p>Some very interesting documentation...</p>
  </v-page>
</v-page>
```

Paramater variables can also be used in pages and are available under the `root-dataset`.

```html
<v-page path="/user/:userid" >
    <p>Viewing $.params.userid</p>
</v-page>
```

Note that the path is not templated and will be renderer as-is.

This is because pages are defined at loading time not on request.

```html
<v-page path="/user/$id" >  <!-- Will not be templated -->
    Woops
</v-page>
```


The tag <a class="link" href="/reference#v-index" >&lt;v-index&gt;</a> can be used when we want to match a page path exactly.

```html
<v-page path="/user" >
  <!-- This header will show for all /user pages -->
  <header>Users page</header>

  <!-- This will only show when the path is '/user' -->
  <v-index>
    Select a user to continue
  </v-index>

  <!-- This will only show when the path is '/user/:userid' -->
  <v-page path="/user/:userid">
    <p>Viewing user $.params.userid</p>
  </v-page>
</v-page>
```

When a <a class="link" href="/reference#form" >&lt;form&gt;</a> is used inside an <a class="link" href="/reference#v-page" >&lt;v-page&gt;</a> tag the page path is included in the action path so it's params can be accesed inside the form (more on this later).

```html
<v-page path="/list/listid" >
  <form v-name="create_entry" method="post" >

    <v-action>
      <v-sql>
        INSERT INTO list_entries (listid, text) VALUES ($.params.listid, $.body.text);
      </v-sql>
    </v-action>

    <input name="text" type="text" required />
  </form>
</v-page>
```
