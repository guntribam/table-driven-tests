# table-driven-tests
> Plugin to use markdown tables as test data on [japa](https://japa.dev) framework

The `table-driven-tests` plugin makes it simple to use markdown tables on your tests using japa. 

Create a markdown table with the same filename as your test and you have an array with each row of your table as data.


- [table-driven-tests](#table-driven-tests)
- [Installation](#installation)
- [Usage](#usage)
- [Questions](#questions)
  - [How can i change the extension?](#how-can-i-change-the-extension)
  - [What if i don't want to name the table as my file?](#what-if-i-dont-want-to-name-the-table-as-my-file)
  - [How can i get the row on my test already typed?](#how-can-i-get-the-row-on-my-test-already-typed)
- [Complex example using adonis](#complex-example-using-adonis)

# Installation
Install the package from the npm registry as follows:

```sh
npm i table-driven-tests

yarn add table-driven-tests

pnpm add table-driven-tests
```

# Usage

Import the package function and add it to `plugins` array
```ts
import tableDrivenTests from 'table-driven-tests'
import { configure } from '@japa/runner'

configure({
  plugins: [tableDrivenTests()]
})
```
Now, create a file with the same name as the test, changing the extension to `.md`, as the example:
```
Sum.spec.ts
Sum.md
```
Let's imagine you have the following table

| # | X  | Y  | result |
|---|----|----|--------|
| 1 | 2  | 2  | 4      |
| 2 | -2 | -2 | -4     |
| 3 | 0  | 0  | 0      |

After you run your project you'll be able to access the row of the table with the headers as properties
```ts
function sum(a, b) {
  return a + b
}

test('add two numbers')
   .withTableData()
   .run(({assert}, row) => {
     assert.equal(sum(Number(row.X), Number(row.Y)), row.result)
   })
```
# Questions

## How can i change the extension?
Provide a property `extension` to a config object:
```ts
tableDrivenTests({
    extension: '.fixture.ts'
})

```

## What if i don't want to name the table as my file?
Provide a `tablePath` when performing tests, remember that is the fullpath to the file
```ts
.withTableData({tablePath: __filename}) //default value

```

## How can i get the row on my test already typed?
Provide an `dictionary` async function with the following structure:
```ts
const dictionary = async () => ({
  'X':      { field: '', domain: { '2': 2, '-2': -2, '0': 0 } },
  'Y':      { field: '', domain: { '2': 2, '-2': -2, '0': 0 } },
  'result': { field: '', domain: { '4': 4, '-4': -4, '0': 0 } }
})

function sum(a, b) {
  return a + b
}

test.group('Math.add', () => {
  test('add two numbers')
    .withTableData({ dictionary })
    .run(({ assert }, row) => {
      assert.equal(sum(row.X, row.Y), row.result) //Number right here
    })
})
```

# Complex example using adonis


