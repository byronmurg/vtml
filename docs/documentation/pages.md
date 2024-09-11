# Pages

Pages allow us to create multiple pages within out website.

The only tag for creating pages is `v-page`.

When the loader reaches an `v-page` tag it will only display if the path matches the current request.


For eaxmple:
```
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


```
<v-page path="/tutorial" >
    <h3>Tutorial</h3>

    <v-page path="/tutorial/pages" >
        <p>Some very interesting documentation...</p>
    </v-page>
</v-page>
```

Paramater variables can also be used in pages and are available under the `root-dataset`.

```
<v-page path="/user/:userid" >
    <p>Viewing $.params.userid</p>
</v-page>
```

Note that the path is not templated and will be renderer as-is.

This is because pages are defined at loading time not on request.

```
<v-page path="/user/$id" >  <!-- Will not be templated -->
    Woops
</v-page>
```

When a form is used inside an `v-page` tag the page path is included in the action path so it's params can be accesed inside the form (more on this later).

```
<v-page path="/list/listid" >
    <form v-name="create_entry" method="post" >

        <v-sql-action>
            insert into list_entries (listid, text) values ($.params.listid, $.body.text);
        </v-sql-action>

        <input name="text" type="text" required />
    </form>
</v-page>
```
