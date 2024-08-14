# Logic

Several of our tags can be classed as _logic_ tags in that they conditionally render their contents.

Here we will have a closer look at a few of them.

## x-if/x-unless

The most literal of the logic tags is `x-if`.

`x-unless` works in exactly the same way as `x-if` but inverses the logic so that the expression must be false (or falsey).

In it's most basic usage `x-if` just checks if the variable at target is truthy:
```
<x-json target="foo" >"bar"</x-json>

<x-if source="$foo" >foo is truthy</x-if>   <!-- will render -->
<x-if source="$bar" >bar is truthy</x-if>   <!-- will not render as bar is undefined -->
```

And of course `x-unless` does the opposite.
```
<x-json target="foo" >"foo"</x-json>

<x-unless source="$foo" >foo is truthy</x-unless>   <!-- will not render as foo is truthy -->
<x-unless source="$bar" >bar is truthy</x-unless>   <!-- will render as bar is undefined -->
```

We can also check if a variable is equal to either a litteral or another variable
```
<x-json target="foo" >"foo"</x-json>
<x-json target="foo_again" >"foo"</x-json>

<x-if source="$foo" eq="foo" >matches litteral</x-if>
<x-if source="$foo" eq="$foo_again" >matches litteral</x-if>
```


But we can also do some more complex numeric comparisons.

```
<x-json target="foo" >22</x-json>

<x-if source="$foo" gt="20" >is greater than 10</x-if>
<x-if source="$foo" lt="100" >is less than 10</x-if>
```

## x-with

`x-with` will display it's contents if the `source` reference is truthy. But it will also set the current frame to be the target variable.

```
<x-with source="$name" >
    <p>name = $</p>
</x-with>
```

In a simple sense `x-with` is almost exactly equivilent to nesting `x-use` and `x-if`

```
<x-with source="$foo" >
    <p>foo = $</p>
</x-with>

<!-- Is the same as ... -->

<x-use source="$foo" >
    <x-if>
        <p>foo = $</p>
    </x-if>
</x-use>
<!-- OR -->
<x-if source="$foo" >
    <x-use source="foo" >
        <p>foo = $</p>
    </x-use>
</x-if>

```

