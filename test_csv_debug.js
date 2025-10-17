import { generateCSV } from './src/utils/exportHelpers.js'

const expenses = [
  { id: 1, name: 'Summer', amount: 500, frequency: 'monthly', startMonth: 6, endMonth: 8 }
]
const csv = generateCSV(expenses, 5700, 0)

const lines = csv.split('\n')
const summerLine = lines.find(line => line.includes('Summer'))

console.log('Full CSV:')
console.log(csv)
console.log('\nSummer line:')
console.log(summerLine)
console.log('\nSplit summer line:')
console.log(summerLine.split(','))
