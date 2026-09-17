import { PrismaClient } from '@prisma/client'
import * as path from 'path'
import * as fs from 'fs'
import * as XLSX from 'xlsx'

// Load .env from admin-panel directory
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let val = (match[2] || '').trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      if (!process.env[key]) process.env[key] = val
    }
  })
}

const dbUrl = process.env.DATABASE_URL
const prisma = new PrismaClient({
  datasources: dbUrl ? { db: { url: dbUrl } } : undefined
})

interface ResponseDef {
  orderIndex: number
  text: string
  category: string
  requiresFollowUp: boolean
  followupDays: number
}

async function main() {
  console.log('Seeding 36 master predefined responses...')

  let filePath = path.resolve(process.cwd(), '../leads Response.xlsx')
  if (!fs.existsSync(filePath)) {
    filePath = path.resolve(process.cwd(), 'leads Response.xlsx')
  }
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  const items: ResponseDef[] = []

  rawData.forEach((row) => {
    if (row && row.length >= 2 && typeof row[1] === 'string' && row[1].trim()) {
      const order = typeof row[0] === 'number' ? row[0] : items.length + 1
      const text = row[1].trim()

      let category = 'Other'
      let requiresFollowUp = false
      let followupDays = 0

      if (text.includes('રોંગ નંબર') || text.includes('બંધ નંબર')) {
        category = 'Invalid Contact'
      } else if (text.includes('ગાડી વેચી') || text.includes('ગાડી પડતર') || text.includes('ગાડી સ્ક્રેપ') || text.includes('ફાઈનાન્સ વાળા')) {
        category = 'Vehicle Inactive'
      } else if (text.includes('બીજા પાસે') || text.includes('શોરૂમ') || text.includes('બીજે કરાવી') || text.includes('ANGEL')) {
        category = 'Lost to Competitor'
      } else if (text.includes('વાત જ કરવા') || text.includes('ફોન ના કરતા') || text.includes('ના જ પાડે')) {
        category = 'Not Interested'
      } else if (text.includes('ફોલોઅપ') || text.includes('ચાન્સ છે')) {
        category = 'Follow Up'
        requiresFollowUp = true
        followupDays = 3
      } else if (text.includes('ફોન લાગે છે પણ રિસિવ નથી કરતા')) {
        category = 'No Answer'
        requiresFollowUp = true
        followupDays = 1
      } else if (text.includes('પૈસાનો વેંત નથી')) {
        category = 'Follow Up'
        requiresFollowUp = true
        followupDays = 7
      } else if (text.includes('expiry date અલગ છે')) {
        category = 'Rescheduled'
        requiresFollowUp = true
        followupDays = 14
      } else if (text.includes('RENEWAL લીસ્ટ') || text.includes('TAKEN LIST')) {
        category = 'Existing Pipeline'
        requiresFollowUp = true
        followupDays = 5
      }

      items.push({
        orderIndex: order,
        text,
        category,
        requiresFollowUp,
        followupDays
      })
    }
  })

  // Add 3 standard workflow completion responses to reach the finalized 36 master responses
  const standardResponses: Omit<ResponseDef, 'orderIndex'>[] = [
    {
      text: 'કોલ બેક / રસ ધરાવે છે (Callback Requested)',
      category: 'Follow Up',
      requiresFollowUp: true,
      followupDays: 2
    },
    {
      text: 'પોલિસી ઈશ્યુ થઈ ગઈ / સફળ (Policy Issued / Won)',
      category: 'Closed Won',
      requiresFollowUp: false,
      followupDays: 0
    },
    {
      text: 'વીમો કરાવવા રસ નથી (Closed Lost)',
      category: 'Closed Lost',
      requiresFollowUp: false,
      followupDays: 0
    }
  ]

  standardResponses.forEach((sr) => {
    items.push({
      orderIndex: items.length + 1,
      ...sr
    })
  })

  console.log(`Total responses configured: ${items.length}`)

  for (const item of items) {
    await prisma.predefinedResponse.upsert({
      where: { text: item.text },
      update: {
        orderIndex: item.orderIndex,
        category: item.category,
        requiresFollowUp: item.requiresFollowUp,
        followupDays: item.followupDays,
        isActive: true
      },
      create: {
        text: item.text,
        orderIndex: item.orderIndex,
        category: item.category,
        requiresFollowUp: item.requiresFollowUp,
        followupDays: item.followupDays,
        isActive: true
      }
    })
  }

  console.log(`Successfully seeded ${items.length} master predefined responses into database!`)
}

main()
  .catch((e) => {
    console.error('Error seeding responses:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
