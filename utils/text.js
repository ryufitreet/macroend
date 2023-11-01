export const getMaxLength = (stringList) => {
  if (!Array.isArray(stringList)) throw Error('formatColumn for Arrays only')
  let maxLength = 0
  for (const s of stringList) {
    if (s.length > maxLength) maxLength = s.length
  }
  return maxLength
  
}

// TODO check length of Arrays
// Тупые условия
export const formatColumnCellOutput = (value, length = 25, maxLength = 30) => {
  let str = value
  // Cut by maximum
  
  // Никогда не выполнится
  if (value.length < length) str = str + " ".repeat(length - str.length)
  else str =  str.substring(0, length)

  if (str.length >= maxLength) {
    str = str.substring(0, maxLength)
  }
  return str
}

export const parseCommand = (str) => {
  const splitted = str.split(" ").filter((it) => it !== '')
  const command = splitted[0]
  // TODO arguments for params
  splitted.shift()
  let lastOption
  const params = splitted.reduce((acc, val) => {
    if (val.startsWith('-')) {
      lastOption = val
      acc[val] = []
    } else if (acc[lastOption] != null) {
      acc[lastOption].push(val)
    }
    return acc
  }, {})
  return { command, params }
}
