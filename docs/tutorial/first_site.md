# My first site

Now that we've gotten our feet wet with VTML it's time to start making some web pages.

We're going to start simple by making DogDB, a website to keep track of all the dogs we've met.

## We're going to need a database
To keep life simple we're going to use an SQLite database to keep track of our dogs.

If you have sqlite installed you can create the db really easily by running

```bash
$ sqlite3 dogsdb.sqlite
sqlite> create table dogs (id INTEGER PRIMARY KEY, name TEXT, description TEXT, smelly INT, cheeky INT);
```

But if you can't be bothered at all with that then go ahead and download one
I made earlier at [https://vtml.org/assets/dogsdb.sqlite](/assets/dogsdb.sqlite)


Let's add a row to our table manually so that we can see what's going on. If you downloaded
the example db from assets this row has already been added.
```bash
sqlite> insert into dogs (name, description, smelly, cheeky) values ('Freddy', 'The official VTML dog', 8, 9);
```


## Where were we?
We can start with the `index.vtml` that we used in the last tutorial. If you've skipped ahead
and come straight here then you need an index.vtml that looks like this
```
<html lang="en" >
  <head>
    <title>DogsDB</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" >
  </head>
    <body>
      <main class="container" >
        <v-include src="./main.vtml" />
      </main>
    </body>
</html>
```

And of course a `main.vtml` file (which can be empty)

We need to tell VTML where our new database is using the `DB_URL` variable.

```bash
$ DB_URL="sqlite://dogsdb.sqlite" vtml --dev index.vtml
```

## Starting with some data

Let's head back over to `main.vtml` and add the following content

```html
<v-sql target=$dogs >
  select * from dogs;
</v-sql>
```

This <a class="link" href="/reference#v-sql" >&lt;v-sql&gt;</a> will select all rows from the dogs table and put it into the **$dogs** variable.

To start with let's just dump out the **$dogs** variable. We can use <a class="link" href="/reference#v-dump" >&lt;v-dump&gt;</a> to just spit data JSON encoded into a `<pre>` tag.

```html
    <v-dump $dogs />
```

If we now go back to our web browser on [localhost:3000/]("https://localhost:3000/") and reload the page we can
see that the contents of our dogs table.

Now we need to actually render the rows. Replace <a class="link" href="/reference#v-dump" >&lt;v-dump&gt;</a> with this.

```html
<v-for-each $dogs as=$dog >
  <article>
    <header><h3>$dog.name</h3></header>
    <div class="grid" >
      <img src="https://vtml.org/assets/vtml_logo.svg" class="dog_image" width=200 alt=$dog.name />
      <v-if $dog.description >
        <p>$dog.description</p>
      </v-if>
      <div>
        <label>smelly</label>
        <progress value=$dog.smelly max=10 />

        <label>cheeky</label>
        <progress value=$dog.cheeky max=10 />
      </div>
    </div>
  </article>
</v-for-each>
```

Okay that's a lot going on there. Let's go through it line by line

First we loop through those dogs as $dog

```html
<v-for-each $dogs as=$dog >
```

We wrap each entry in a article because it looks pretty.
```html
<article>
```
We add a header for the article using with the name of the dog.
```html
<header><h3>$dog.name</h3></header>
```

Next a grid div which will just lay out the article.
```html
<div class="grid" >
```
Then an image which just displays the vtml dog but we use the dog's name as an alt attribute.
```html
<img src="https://vtml.org/assets/vtml_logo.svg" width=200 alt=$dog.name />
```
Display the dog's description 
```html
<p>$dog.description</p>
```

Finally add a `<label>` and `<progress>` for the two numeric values. We use **$dog.KEY** as the `value=` attribute of both.
```html
<div>
  <label>smelly</label>
  <progress value=$dog.smelly max=10 />

  <label>cheeky</label>
  <progress value=$dog.cheeky max=10 />
</div>
```

Great, now we can see the records in our mini-database.

Next we'll add a form which is where the real power of VTML comes in.

