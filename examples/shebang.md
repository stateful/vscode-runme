# Runme Language Support

By default Runme can run everything that is also installed on your machine.
Read more in our [docs](https://docs.runme.dev/features#interpreter)

## Like Python:

```py
print("Hello Pythonista 🐍")
```

## maybe Ruby?

```rb
# Open up the String class to add a new method
class String
  # Define a new method to reverse the words in a string
  def reverse_words
    self.split(' ').reverse.join(' ')
  end
end

# Use the new method on a string
sentence = "Hello Ruby world"
puts "Original sentence: #{sentence}"
puts "Reversed words: #{sentence.reverse_words}"
```

## or JavaScript:

```js
console.log("Always bet on JS!")
```

## even TypeScript:

Make sure you have `ts-node` installed globally:

```sh
npm i -g ts-node
```

then run:

```ts
const myVar: string = 'I am a typed string!'
console.log(myVar)
```

## and, of course, PHP

Be sure to have the `php` interpreter in your `$PATH`:

```php { interpreter=php }
<?php
$greeting = "Hello, World!";
$currentDateTime = date('Y-m-d H:i:s');

// Concatenate the greeting with the current date and time
$fullGreeting = $greeting . " It's now " . $currentDateTime . "\n";

echo $fullGreeting;
?>
```
