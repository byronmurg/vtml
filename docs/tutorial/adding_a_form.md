
# Forms

We need a way to update the dogs table so let's go ahead and create a new form.

```html
<form v-name="create_dog" >
  <input name="name" type="text" placeholder="name" required />
  
  <textarea name="description" placeholder="description" required />
  
  <label>Smelly
  	<input name="smelly" type="range" min=0 max=10 value=5 step=1 required />
  </label>
  
  <label>Cheeky
  	<input name="cheeky" type="range" min=0 max=10 value=5 step=1 required />
  </label>
  
  <button type="submit" >create</button>
  
  <v-action>
    <v-sql>
  	insert into dogs (name, description, smelly, cheeky) values (
  		$.body.name,
  		$.body.description,
  		$.body.smelly,
  		$.body.cheeky
  	);
    </v-sql>
  </v-action>
</form>
```

Now most parts of the form should be self explanitory if you've ever made a page in HTML
before, but the <a class="link" href="/reference#v-action" >&lt;v-action&gt;</a> part is where the magic happens.

<article class="secondary-container" >
<i>info</i>
The v-name attribute is the really important part. That's what tells VTML that it needs to
create a new route, api entry, and isolate for the form.
</article>


Alright let's try it out! You should now be able to add new dogs to the page. Of course we've
only added one attribute "smell" to the form but see if you can add the rest.

But we didn't just add a form to the ui and a handler, we have also defined an API endpoint.
In your browser you can now navigate to http://localhost:3000/_api/ and see a new endpoint
has been created. You can even call it directly and add new dogs to your file.






## Adding an error page
Let's add an error page to handle any errors that might be thrown in our page. Edit the <main>
tag to look like this

```html
<main class="container" >
  <v-try>
    <v-include src="./main.vtml" />
  </v-try>
  <v-catch>
    Error: $error.message
  </v-catch>
</main>
```

If the page encounters an error it will render the <v-catch> block with a special variable
$error which contains the error message. Not to worry this won't expose any sensitive errors
that might be thrown. The v-try block meanwhile will not render if the page starts with an
error. So if the client tries to request an invalid page for example the block will not
render.


You can try out the error page by breaking the sql statement or by browsing to an unknown
path like "https://localhost:3000/doesntexist"
    
