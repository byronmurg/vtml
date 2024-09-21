
```html
<h3>VTML is...</h3>
<v-nodejs target=$adjectives >
    return ["fast", "easy", "awesome"]
</v-nodejs>

<ul>
    <v-for-each source=$adjectives as=$adj >
        <li>$adj</li>
    </v-for-each>
</ul>
```
