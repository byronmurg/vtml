
# Auth

Our dogs DB is looking great but right now anyone can view and alter our data. Although we may want to show our canine companions to the whole world anyone could add their own dog, or event worse they could start adding cats!


To rectify this we need to add an auth-barrier into our app. VTML has a simple mechanism for deciding who gets to use what.

First of all we will need to add a table to our database to store the users. We're also going to be adding session data to this table to keep it nice and simple.

After running `sqlite3 dogsdb.sqlite` input this SQL to create a users table with three fields:

```sql
CREATE TABLE users (name TEXT, password_hash TEXT, session_key TEXT);
```

<article class="secondary-container" >
<i>info</i>
If you downloaded the example database this has already been done for you.
</article>


Next up we'll need a way to create password hashes. This will stop anyone from being able to see the user's passwords in plain text when they look at the database. To do this we'll need to call nodejs directly.

Create a new file called `hash_password.js` and add the following:

```javascript
import crypto from 'node:crypto'

export default
function hash_passport(password) {
	return crypto.createHash('md5').update(password).digest('hex');
}
```

It's a very simple hashing function and shouldn't be used in the real world but it will do for now.

Let's go ahead and make this function available to VTML. At the top of your `index.vtml` add this tag:

```
<v-nodejs target="$hash_password" import="./hash_password.js" />
```

<article class="secondary-container" >
<i>info</i>
We could have imported the function like so:

```
<v-nodejs target="$hash_password" >
import hash_password from "./hash_password"
return hash_passport
</v-nodejs>
```

However VTML would see that as an external data-source and execute it for every request. By importing with the `--import` attribute we're telling VTML that
it's an external source file which only needs to be imported on application startup.

</article>

The last thing we need to do outside of VTML is add an initial user to the dataabse. We'll add a user named `admin` with the password `password1`. Not very original but that's fine for now.

```sql
INSERT INTO users (name, password_hash) VALUES ('admin', '7c6a180b36896a0a8c02787eeafb0e4c')
```

Once we have everything setup we're going to want to add a login page. Remember in the last chapter when we created the route `<v-route path='/' >` in `main.vtml`. Well let's go back and add a new route inside it with a login form.

```html
<v-route path=`/login` >
    <form v-name="login" method="post" >
        <input name="username" />
        <input name="password" type="password" />

        <v-action>
            ...
        </v-action>
    </form>
</v-route>
```

For the action we need to do five things when the login is valid:
- Create a has of the input password.
- Get the user with this username and password.
- Set the session key in the response.
- Set the session key in the 
- Redirect the client back to the index.

```html
<v-action>

    <v-nodejs target=$hash >
        return $hash_password($.body)
    </v-nodejs>

    <v-sql single-row target=$user >
        SELECT * FROM users WHERE name = $.body.username AND password_hash = $hash;
    </v-sql>

    <v-check-found $user >
        <v-nodejs target=$session_key >
            return Math.random()
        </v-nodejs>

        <v-sql>
            UPDATE USERS SET session_key = $session_key WHERE name = $username;
        </v-sql>

        <v-set-cookie name="session_key" value=$session_key max-days=1 />

        <v-redirect path="/" />
    </v-check-found>

</v-action>
```

The new tag that we used here is <a class="link" href="/reference#v-check-found" >&lt;v-check-found&gt;</a> which will cause the response to return a 404 status when the source variable (`$user` in this case) is falsy (or undefined in this case).

To better explain the `v-check` tags let's add another one into our application. Let's say that we want guests to the site to be able to view any of the dogs but not create or edit them.

To do so we want to use a different `v-check` tag <a class="link" href="/reference#v-check-authorized" >&lt;v-check-authorized&gt;</a> which, similar to the `v-check-found` tag will return 401 when when the condition is false.

To apply this we need to revisit the routing block in `main.vtml` and change it to look like so:

```html
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

    <v-route path=`/login` >
        <form v-name="login" method="post" >
            ...
        </form>
    </v-route>

    <v-page path="/create" >
        <v-check-authorized $user >
            <form v-name="create_dog" >
                ...
            </form>
        </v-check-authorized>
    </v-page>

```

Now our application will set a 401 status and display an error message when we try to visit this page as `$user` is undefined.

The last thing we need to do is check if clients are currently logged in.

At the top of `main.vtml` add this:

```
<v-sql single-row target=$user >
    SELECT * FROM users WHERE session_key = $.cookies.session_key
</v-sql>
```

And that's it! Now users can view the site but need to be logged in with a valid user to be able to add our own pooches.

