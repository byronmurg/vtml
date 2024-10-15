# SQL

VTML provides the <a class="link" href="/reference#v-sql" >&lt;v-sql&gt;</a> tag to conveniently query an SQL database.

In order to use the built-in sql integration VTML must be started with the `DB_URL` environment variable.

Currently supported databases are:

| Type | Prefix | Example |
|------|--------|---------|
| PostgreSQL | pg/postgres/postresql | postgresql://user:pass@localhost:5432/mydb |
| SQLite3    | sqlite/sqlite3 | sqlite://database\_file.sqlite |
| MySQL/MariaDB | mysql | mysql://user:pass@localhost:3306/mydb |

You can use <a class="link" href="/reference#v-sql" >&lt;v-sql&gt;</a> like so:
```html
<v-sql target=$things >
    select * from things;
</v-sql>
```

Variables are automatically bound but may need coercion in some cases:

```html
<v-sql target=$things >
    select * from things where name = $.query.search::text;
</v-sql>
```


You can also use the <a class="link" href="/reference#v-nodejs" >&lt;v-nodejs&gt;</a> interface directly.

The nodejs interface always uses `?` as it's variable anchor.

```html
<v-nodejs target=$from_node >
    return sql.query(`select * from things where name = ?`, [ $.query.search ])
</v-nodejs>
```

## Using your own

Of course there's nothing stopping you from using a pre-existing nodejs database connector or ORM.

To do so just import the entrypoint using v-nodejs' `import=` attribute.

```html
<v-nodejs target=$orm import="./my_super_orm" />

<v-nodejs target=$stuff >
    return $orm.search_stuff($.query.search)
</v-nodejs>
```
