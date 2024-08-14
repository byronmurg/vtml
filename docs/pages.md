# Pages

Pages allow us to create multiple pages within out website.

The only tag for creating pages is `x-page`.

When the loader reaches an `x-page` tag it will only display if the path matches the current request.


For eaxmple:
```
<html>

    <header>
        <h1>Title</h1>   <!-- This will always be displayed -->
    </header>

    <x-page path="/tutorial" >
        I'm the tutorial page
    </x-page>

    <x-page path="/reference" >
        I'm the reference page
    </x-page>

</html>
```

If pages are nested then the **full path** must be used on all subsequent pages.


```
<x-page path="/tutorial" >
    <h3>Tutorial</h3>

    <x-page path="/tutorial/pages" >
        <p>Some very interesting documentation...</p>
    </x-page>
</x-page>
```

Paramater variables can also be used in pages and are available under the `root-dataset`.

```
<x-page path="/user/:userid" >
    <p>Viewing $.params.userid</p>
</x-page>
```

Note that the path is not templated and will be renderer as-is.

This is because pages are defined at loading time not on request.

```
<x-page path="/user/$id" >  <!-- Will not be templated -->
    Woops
</x-page>
```

When a form is used inside an `x-page` tag the page path is included in the action path so it's params can be accesed inside the form (more on this later).

```
<x-page path="/list/listid" >
    <form x-name="create_entry" method="post" >

        <x-sql-action>
            insert into list_entries (listid, text) values ($.params.listid, $.body.text);
        </x-sql-action>

        <input name="text" type="text" required />
    </form>
</x-page>
```
