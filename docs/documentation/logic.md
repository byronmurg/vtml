# Logic

Several of our tags can be classed as _logic_ tags in that they conditionally render their contents.

Here we will have a closer look at a few of them.

## v-if/v-unless

The most literal of the logic tags is <a class="link" href="/reference#v-if" >&lt;v-if&gt;</a>.

<a class="link" href="/reference#v-unless" >&lt;v-unless&gt;</a> works in exactly the same way as <a class="link" href="/reference#v-if" >&lt;v-if&gt;</a> but inverses the logic so that the expression must be false (or falsey).

In it's most basic usage <a class="link" href="/reference#v-if" >&lt;v-if&gt;</a> just checks if the variable at target is truthy:
```html
<v-json target=$foo >"bar"</v-json>

<v-if $foo >foo is truthy</v-if>   <!-- will render -->
<v-if $bar >bar is truthy</v-if>   <!-- will not render as bar is undefined -->
```

And of course <a class="link" href="/reference#v-unless" >&lt;v-unless&gt;</a> does the opposite.
```html
<v-json target=$foo >"foo"</v-json>

<v-unless $foo >foo is truthy</v-unless>   <!-- will not render as foo is truthy -->
<v-unless $bar >bar is truthy</v-unless>   <!-- will render as bar is undefined -->
```

We can also check if a variable is equal to either a litteral or another variable
```html
<v-json target=$foo >"foo"</v-json>
<v-json target=$foo_again >"foo"</v-json>

<v-if $foo eq="foo" >matches litteral</v-if>
<v-if $foo eq=$foo_again >matches variable</v-if>
```


But we can also do some more complex numeric comparisons.

```html
<v-json target=$foo >22</v-json>

<v-if $foo gt="20" >is greater than 10</v-if>
<v-if $foo lt="100" >is less than 10</v-if>
```
