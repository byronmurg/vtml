
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

```html
<v-nodejs target="$hash_password" import="./hash_password.js" />
```

<article class="secondary-container" >
<i>info</i>
We could have imported the function like so:

```html
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
INSERT INTO users (name, password_hash) VALUES ('admin', '7c6a180b36896a0a8c02787eeafb0e4c');
```

Once we have everything setup we're going to want to add a login page. Let's go back to our `main.vtml` and add a new route inside it with a login form.

```html
<v-page path="/login" >
    <form v-name="login" method="post" >
        <input name="username" placeholder="username" />
        <input name="password" type="password" placeholder="password" />
		<button type="submit" >Login</button>

        <v-action>
            ...
        </v-action>
    </form>
</v-page>
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
        return $hash_password($.body.password)
    </v-nodejs>

    <v-sql single-row target=$user >
        SELECT * FROM users WHERE name = $.body.username AND password_hash = $hash;
    </v-sql>

    <v-check-found $user >
        <v-nodejs target=$session_key >
            return "skey_"+Math.random()
        </v-nodejs>

        <v-sql>
            UPDATE USERS SET session_key = $session_key WHERE name = $.body.username;
        </v-sql>

        <v-set-cookie name="session_key" value=$session_key max-days=1 />

        <v-redirect path="/" />
    </v-check-found>

</v-action>
```

The new tag that we used here is <a class="link" href="/reference#v-check-found" >&lt;v-check-found&gt;</a> which will cause the response to return a 404 status when the source variable (`$user` in this case) is falsy (or undefined in this case).

To better explain the `v-check` tags let's add another one into our application. Let's say that we want guests to the site to be able to view any of the dogs but not create or edit them.

To do so we want to use a different `v-check` tag <a class="link" href="/reference#v-check-authenticated" >&lt;v-check-authenticated&gt;</a> which, similar to the `v-check-found` tag will return 401 when when the condition is false.

We also need to find the user in the database by the `session_key` passed into the request.

To apply this we need to revisit the routing block in `main.vtml` and change the `/create` page to look like so:

```html
<v-page path="/create" >
    <v-sql single-row target=$user >
        SELECT * FROM users WHERE session_key = $.cookies.session_key;
    </v-sql>
    <v-check-authenticated $user >
        <form v-name="create_dog" >
            ...
        </form>
    </v-check-authenticated>
</v-page>

```

Now our application will set a 401 status and display an error message when we try to visit this page when `$user` is undefined.

One last thing we can do is to redirect the user to the login page when they get the 401 status.

Back in the `index.vtml` update the <a class="link" href="/reference#v-catch" >&lt;v-catch&gt;</a> block with a bit of logic to check what the status is:

```html
<v-catch>
  <v-if source=$error.code eq="401" >
  	<v-redirect path="/login" />
  </v-if>

  Error: $error.message
</v-catch>
```

Now when the <a class="link" href="/reference#v-check-authenticated" >&lt;v-check-authenticated&gt;</a> throws a 401 and we end up in the 
<a class="link" href="/reference#v-catch" >&lt;v-catch&gt;</a>
we will be sent to the login page instead of seeing the error.

And that's it! Now users can view the site but need to be logged in with a valid user to be able to add our own pooches.

