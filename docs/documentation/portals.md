# Portals

The <a class="link" href="/reference#v-portal" >&lt;v-portal&gt;</a> tag allows us to render part of the page seperately of it's surroundings. When the page is rendered the content is rendered normally.

Portals are useful when we want to use AJAX to re-render just part of the page. VTML works out where all the variables came from so they can appear _almost_ anywhere.

```html
<v-sql target=$dogs >
    SELECT * FROM dogs
</v-sql>

<form v-name="create_dog" >
    <input name="new_name" required />
    <v-action>
        <v-sql>INSERT INTO dogs (name) VALUES ($.body.new_name)</v-sql>
    </v-action>
</form>

<p>There are $dogs.length doggos</p>

<v-portal path="/dogs/view" >
    <v-for-each>
        <div>
            <p>$dog.name</p>
        </div>
    </v-for-each>
</v-portal>

```

We can now send a GET request to `/dogs/view` and get **only the list** of dogs.

It's worth noting that portals cannot be used _inside_ loops like <a class="link" href="/reference#v-for-each" >&lt;v-for-each&gt;</a> as VTML cannot work out which itteration needs to be rendered.
