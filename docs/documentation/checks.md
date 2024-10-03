# Checks

Sometimes we need to dictate when a client _should_ be able to view or use a resource.

For this VTML utilizes **check tags**.

Check tags work in a similary way to the logic tag <a class="link" href="/reference#v-if" >&lt;v-if&gt;</a> but when the condition is false the page status code is set.


## Examples

Here are some examples of when you might use a check tag:

### v-check-found
```html
<v-page path="/thingy/:id" >
    <v-sql target=$thingy single-row >
        select * from thingies where id = $.params.id
    </v-sql>

    <v-check-found $thingy >
        <div>
            <p>$thingy.title</p>
        </div>
    </v-check-found>
</v-page>
```

### v-check-authenticated

```html
<v-sql target=$user single-row >
    select * from user where email = $.headers.x-email
</v-sql>

<v-check-authenticated $user >
    <p>Hello $user.name</p>
    <p>Take a look at some secrets...</p>
</v-check-authenticated>
```

### v-check-authorized

```html
<v-sql target=$user single-row >
    select * from user where email = $.headers.x-email
</v-sql>

<v-check-authenticated $user >
    <p>Hello $user.name</p>

    <v-check-authorized $user.level gt=3 >
        <p>Take a look at some secrets...</p>
    </v-check-authorized>

</v-check-authenticated>
```


## Using with isolates

Check tags are useful as they can also control when to execute a specific endpoint.

In this example the file `/foo.txt` is always available but `/bar.txt` requires authentication

```
<v-expose path="/foo.txt" src="./assets/foo.txt" />

<v-check-authenticated $user >
    <v-expose path="/bar.txt" src="./assets/bar.txt" />
</v-check-authenticated>
```

