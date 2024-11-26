# Getting started

- You'll need to have `nodejs` installed. A minimum version of 20.0 should suffice. You'll also need to be able to use `npm`.

You can either install `vtml` globally using:
```
sudo npm -g i @vtml/vtml
```

Or if you just want to give it a go without installing system-wide you can use.
```
npx @vtml/vtml
```

### Quick start

To verify that everything is working you can crete a simple template app
```
vtml --template hello > hello.vtml # Create a basic vtml page
vtml hello.vtml                    # Start it up!
```
You can now browse to http://localhost:3000/ and you should see a basic testbed page.

