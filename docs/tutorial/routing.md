
# Routing

Until now we've been working on a single-page application. While that might be fine for simple applications we will soon need to create new pages to break it all up.

To create routes within our application we just need two tags, <a class="link" href="/reference#v-page" >&lt;v-page&gt;</a> and <a class="link" href="/reference#v-index" >&lt;v-index&gt;</a>.


Right now our `main.vtml` looks something like this:

```
<v-sql target=$dogs >
    ...
</v-sql>

<v-for-each $dogs as=$dog >
    ...
</v-for-each>

<form v-name="create_dog" >
    ...
</form>
```

...which is a bit squashed together. Lets start by wrapping this in a route.

```
<v-page path="/" >
    <v-sql target=$dogs >
        ...
    </v-sql>

    <v-for-each $dogs as=$dog >
        ...
    </v-for-each>

    <form v-name="create_dog" >
        ...
    </form>
</v-page>
```

<article class="secondary-container" >
<i>info</i>
VTML assumes that everything is under one '/' route. If we want a VTML app to contain multiple pages we now need to specify the '/' route or it will always return 404.
</article>

So far this doesn't do much. Let's now seperate out the routes.

We'll put our main list as an index. This means that the request path must match the parent route _exactly_. Then let's put the create form into it's own page so that the client has to browse to `/create` to see it.

```
<v-page path="/" >
    <v-index>
        <a href="/create" >Create</a>

        <v-sql target=$dogs >
            ...
        </v-sql>

        <v-for-each $dogs as=$dog >
            ...
        </v-for-each>
    </v-index>

    <v-page path="/create" >
        <form v-name="create_dog" >
            ...
        </form>
    </v-page>
```

We also added an `<a>` tag to the index as a way of navigating to the create form.

But we have a small problem. Now when the user executes the `create_dog` form they just see the form again. VTML by default will always redirect back to the calling page, as long as the origin matches.

To rectify this we need one more tag: <a class="link" href="/reference#v-redirect" >&lt;v-redirect&gt;</a>

In the `v-action` of the `create_dog` form add the tag like so:
```
  <v-action>
    <v-sql>
    INSERT INTO dogs (name, description, smelly, cheeky) VALUES (
      $.body.name,
      $.body.description,
      $.body.smelly,
      $.body.cheeky
    );
    </v-sql>

    <!-- HERE -->
    <v-redirect path="/" />
  </v-action>
```

Now when the user submits the form they will be redirected back to the dog list page.

We can also declare variables within a path to use within the page. As with all request variables we will still have to check them ourselves so don't just trust the information passed into them.

Let's say that we want to have a simple page to view a single dog. We might create something like this:

```
<v-page path="/view/:id" >
    <v-sql single-row target=$dog >
        SELECT * FROM dogs WHERE id = $.params.id
    </v-sql>

    <v-check-found $dog >
        <h3>Dog: $dog.name</h3>

    </v-check-found>
</v-page>
```

Because we have the path `/view/:id` the request variable `$.params.id` will be available to the request.

The tag <a class="link" href="/reference#v-check-found" >&lt;v-check-found&gt;</a> will be covered in the next chapter on authentication.
