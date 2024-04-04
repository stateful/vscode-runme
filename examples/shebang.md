---
runme:
  id: 01HF7B0KJQ8625WYMCRVJADMQF
  version: v3
---

# Runme Language Support

By default Runme can run everything that is also installed on your machine.
Read more in our [docs](https://docs.runme.dev/features#interpreter)

## Like Python:

```py {"id":"01HF7B0KJQ8625WYMCRHW1XHEG"}
print("Hello Pythonista 🐍")
```

## maybe Ruby?

```rb {"id":"01HF7B0KJQ8625WYMCRHW9YEKE"}
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

```js {"id":"01HF7B0KJQ8625WYMCRNP9C0RE"}
console.log("Run scripts via Shebang!")
```

## even TypeScript:

Make sure you have `ts-node` installed globally:

```sh {"id":"01HF7B0KJQ8625WYMCRQCT1F71"}
npm i -g ts-node
```

then run:

```ts {"id":"01HF7B0KJQ8625WYMCRRMQ8MVX"}
const myVar: string = 'I am a typed string!'
console.log(myVar)
```

## and, of course, PHP

Be sure to have the `php` interpreter in your `$PATH`:

```php {"id":"01HF7B0KJQ8625WYMCRVAXDNGJ","interpreter":"php"}
<?php
$greeting = "Hello, World!";
$currentDateTime = date('Y-m-d H:i:s');

// Concatenate the greeting with the current date and time
$fullGreeting = $greeting . " It's now " . $currentDateTime . "\n";

echo $fullGreeting;
?>
```
