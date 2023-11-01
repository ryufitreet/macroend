import { formatColumnCellOutput } from "./text.js"

const log = console.log

export const endOfCommandOutput = () => {
  console.log('---======---')
}

/*
options: {
  colorFunc: { key1: func, key2: func}, - color of value
  keys: ['key0', 'key1', 'key2', 'key3'] - order
}
*/
export const printColumns = (data, options = {}) => {
  if (data ==null || !data.length) return
  const { colorFuncs, keys: optKeys } = options
  const keys = optKeys ?? Object.keys(data[0])
  const maxLengths = {}

  data.forEach(it => {
    keys.forEach(key => {
      if (maxLengths[key] == null || maxLengths[key] < it[key].length) {
        maxLengths[key] = it[key].length
      }
    })
  });
  data.forEach((it) => {
    let string = ''
    keys.forEach((key) => {
      const coloredFunc = colorFuncs?.[key] != null ? colorFuncs[key](it[key]) : v => v
      const resizedStr = formatColumnCellOutput(it[key], maxLengths[key] + 3)
      string += coloredFunc(resizedStr)
    })
    log(string)
  })
}
