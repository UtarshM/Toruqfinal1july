import { PrismaClient } from '@prisma/client'
import * as path from 'path'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding predefined responses from leads Response.xlsx...')

  const filePath = path.resolve(__dirname, '../../leads Response.xlsx')
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  const responses: { orderIndex: number; text: string }[] = []

  rawData.forEach((row) => {
    if (row && row.length >= 2 && typeof row[1] === 'string' && row[1].trim()) {
      const order = typeof row[0] === 'number' ? row[0] : responses.length + 1
      const text = row[1].trim()
      responses.push({ orderIndex: order, text })
    }
  })

  console.log(`Found ${responses.length} responses in Excel file:`)
  responses.forEach(r => console.log(`${r.orderIndex}. ${r.text}`))

  // Clear existing or upsert each
  for (const r of responses) {
    const requiresFollowUp = 
      r.text.includes('ફોલોઅપ') || 
      r.text.includes('ફોન લાગે છે પણ રિસિવ નથી કરતા') ||
      r.text.includes('expiry date અલગ છે') ||
      r.text.includes('પૈસાનો વેંત નથી')

    await prisma.predefinedResponse.upsert({
      where: { text: r.text },
      update: {
        orderIndex: r.orderIndex,
        requiresFollowUp,
        isActive: true
      },
      create: {
        text: r.text,
        orderIndex: r.orderIndex,
        requiresFollowUp,
        isActive: true
      }
    })
  }

  console.log(`Successfully seeded ${responses.length} predefined responses!`)
}

main()
  .catch(e => {
    console.error('Error seeding responses:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
