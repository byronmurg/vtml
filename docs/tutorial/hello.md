# Hello world

## My first page

We have to walk before we can fly, and we have to learn some basic syntax before we
can create the next coolest site on the internet. So let's start by making a very basic
vtml page. Open a file which we'll call `index.vtml` in your favourite text editor and add
the following.

```
<html lang="en" >
    <head>
        <title>Hello world</title>
    </head>
    <body>
        <main>
            <p>Hello</p>
        </main>
    </body>
</html>
```

Now in your terminal simply run:

`$ vtml --dev index.vtml`

If you now open your browser and navigate to *http://localhost:3000* you should see a very
simple page

<article class="secondary-container" >
<i>info</i>
The --dev argument tells the vtml cli to restart whenever a change occurs in the directory.
</article>




## A bit of style

This page looks a bit boring and this tutorial is meant to be fun so let's add a bit of
styling to the page.

We're going to use picocss which will natively style our elements for us. We won't have
to do much extra just add the link to the head into our page and add a
few things here and there.

```
    <head>
        <title>Hello world</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" >
    </head>
```
Also we'll make our `<main>` tag a container which will just center align it for us.

```html
   <main class="container" >
```
  
## Splitting it out
Before we go any further let's split out our workspace a bit.
Create a new file called `main.vtml` and add some new content:

```html
<p>Hello again</p>
```

Now edit the index.vtml and change the `<main>` tag like so:

```html
<main class="container" >
  <v-include src="./main.vtml" ./>
</main>
```

Here we've used the <a class="link" href="/reference#v-include" >&lt;v-include&gt;</a> tag to include another file. In this way we can split our
vtml files down into more managable blocks.






## Using variables
Let's start very simple and add some noddy logic.

Replace the contents of `main.vtml` to look like this:

```html
<v-nodejs target=$greeting >
  return "I'm in javascript"
</v-nodejs>

<p>
  $greeting
</p>
```

Here we've set the variable $greeting with a <a class="link" href="/reference#v-nodejs" >&lt;v-nodejs&gt;</a> tag, then displayed it in a `<p>` tag.


Now let's add some more data to the **$greeting** variable.

```html
<v-nodejs target=$greeting >
  return {
    message: "I'm in javascript",
    color: '#00aaff',
  }
</v-nodejs>

<p style="background-color:$(greeting.color)" >
  $greeting.message
</p>
```

We've changed the **$greeting** variable from a string to an object containing the string message
and a color code.

We can then use those variables in our output by deferencing **$greeting.KEY**.


<article class="secondary-container" >
<i>info</i>
You can see that in the style tag i've used the syntax $(var.key) this helps us when there may be characters after the variable for example "width:$(ui.size)px".
</article>


## A bit of logic
Now we're going to have a look at adding some conditionals to our page.

Let's alter what we have so far.

```html
<v-nodejs target=$greeting >
  return {
    message: "I'm in javascript",
    color: '#00aaff',
    display: true,
  }
</v-nodejs>

<v-if $greeting.display >
  <p style="background-color:$(greeting.color)" >
      $greeting.message
  </p>
</v-if>
```

If you refresh your page now you wil not see any difference, but if you then set `display:false` 
inside the <a class="link" href="/reference#v-nodejs">v-nodejs</a> tag you will see an empty page.

The <a class="link" href="/reference#v-if">v-if</a> block will be default display it's contents only if a variable is truthy.

Now let's changing our <a class="link" href="/reference#v-if">v-if</a> tag a bit.
```html
<v-if $greeting.display eq=false >
```

Now the content will show only if $greeting.display is equal to false.


I'll mention now that we're using the shorthand syntax for the source attribute.
When vtml finds a variable attribute on it's own it assumes that it is for the
source attribute

```html
<!-- These two are exactly the same -->
<v-if source="$foo" >
<v-if $foo >
```

Let's return to our little page and switch it up again.

```html
<v-nodejs target=$greeting >
  return {
    message: "I'm in javascript",
    color: '#00aaff',
    display: true,
  }
</v-nodejs>

<v-if $greeting.display >
  <p style="background-color:$(greeting.color)" >
    $greeting.message
  </p>
</v-if>
<v-unless $greeting.display >
  <p>Nothing to see here</p>
</v-unless>
```

Now we have something to show when display:false . <a class="link" href="/reference#v-unless">v-unless</a> works in exactly the same way as <a class="link" href="/reference#v-if">v-if</a> but inverted so that it only displays when falsy.


## A little loopy
Finally we're going to add a little loop to our tiny page.

```html
<v-nodejs target=$greeting >
  return {
    message: "I'm in javascript",
    color: '#00aaff',
    verbs: ["Fast", "Fun", "Easy"],
    display: true,
  }
</v-nodejs>

<v-if $greeting.display >
  <p style="background-color:$(greeting.color)" >
    $greeting.message
  </p>

  <p>VTML is</p>
  <ul>
    <v-for-each $greeting.verbs as=$verb >
      <li>$verb</li>
    </v-for-each>
  </ul>
</v-if>
<v-unless $greeting.display >
  <p>Nothing to see here</p>
</v-unless>
```

After our greeting we now have a loop which itterates through the $greeting.verbs array
and populates a `<ul>` tag.

## Next time on VTML...
So we've learnt the basics of VTML but We have barely scratched the surface of it's features.

Next we're going to look at creating something that we can actually use.
