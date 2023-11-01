import { parseCommand } from './utils/text.js'

const cmds = [
  "wb",
  "wb ",
  "wb  ",
  "wb  hello",
  "wb  -hellyear",
  "wb  -hellyear   ",
]

cmds.forEach((it) => {
  console.log(parseCommand(it))
})

