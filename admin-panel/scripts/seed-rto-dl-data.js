const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding DL Work and Vehicle RTO Work data...')

  // Parse Indian DD/MM/YYYY into Date
  function parseDateDMY(dmy) {
    if (!dmy) return null
    const [d, m, y] = dmy.split('/').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
  }

  // 1. DL Work Data (6 records)
  const dlRecords = [
    {
      srNo: 1,
      inDate: parseDateDMY('04/01/2024'),
      name: 'BAMBHAVBA VIKRAM MAIYABHAI',
      workType: 'NEW DL 2,4',
      amount: 2500,
      jama: 0,
      baki: 2500,
      mobileNo: '9265647656',
      remarks: 'PAYMENT AVE PACHI J KARVU',
      status: 'pending'
    },
    {
      srNo: 2,
      inDate: parseDateDMY('07/01/2024'),
      name: 'GHONIYA AZIM YUSUFBHAI',
      workType: 'RENEW FACELESS',
      amount: 1000,
      jama: 1000,
      baki: 0,
      mobileNo: '9913052952',
      remarks: '',
      status: 'completed'
    },
    {
      srNo: 3,
      inDate: parseDateDMY('08/01/2024'),
      name: 'MITESH RAMESHCHANDRA ADTHAKKAR',
      workType: 'ADD TRANS ( HEAVY LICENSE )',
      amount: 5500,
      jama: 5500,
      baki: 0,
      mobileNo: '9427222508',
      remarks: '',
      status: 'completed'
    },
    {
      srNo: 4,
      inDate: parseDateDMY('08/01/2024'),
      name: 'BHAVESH RAMESHCHANDRA ADTHAKKAR',
      workType: 'ADD TRANS ( HEAVY LICENSE )',
      amount: 4500,
      jama: 4500,
      baki: 0,
      mobileNo: '9427222508',
      remarks: '',
      status: 'completed'
    },
    {
      srNo: 5,
      inDate: parseDateDMY('09/01/2024'),
      name: 'LOLADIYA GULJAR',
      workType: 'NEW DL 2,4',
      amount: 2500,
      jama: 2500,
      baki: 0,
      mobileNo: null,
      remarks: '',
      status: 'completed'
    },
    {
      srNo: 6,
      inDate: parseDateDMY('12/01/2024'),
      name: 'YUSUFBHAI KHURESHI',
      workType: 'DL RENEWAL',
      amount: 2200,
      jama: 2200,
      baki: 0,
      mobileNo: '9726915125',
      remarks: '',
      status: 'completed'
    }
  ]

  // Clear existing dl_work to avoid duplication on re-run
  await prisma.dLWork.deleteMany({})

  for (const dl of dlRecords) {
    await prisma.dLWork.create({
      data: dl
    })
  }
  console.log(`Seeded ${dlRecords.length} DL Work records.`)

  // 2. Vehicle RTO Work Data (6 records)
  const rtoRecords = [
    {
      srNo: 1,
      inDate: parseDateDMY('01/01/2024'),
      customerName: 'IKBAL IBRAHIM KHOKHAR',
      workType: 'INS CF TO HPT',
      vehicleType: 'COMMERCIAL',
      vehicleNo: 'GJ36T0767',
      vehicleNumber: 'GJ36T0767',
      amount: 18000,
      fees: 18000,
      jama: 18000,
      baki: 0,
      mobileNo: '6352829435',
      insuranceByTorque: 'DONE',
      remarks: 'INSU DONE',
      status: 'completed'
    },
    {
      srNo: 2,
      inDate: parseDateDMY('01/01/2024'),
      customerName: 'SONAGRA PUNIT VIA SAMEER',
      workType: 'TO PERMIT',
      vehicleType: 'COMMERCIAL',
      vehicleNo: 'GJ10TW8886',
      vehicleNumber: 'GJ10TW8886',
      amount: 3000,
      fees: 3000,
      jama: 0,
      baki: 3000,
      mobileNo: '6351113901',
      insuranceByTorque: 'NO',
      remarks: 'DOCUMENTS RETURNED',
      status: 'pending'
    },
    {
      srNo: 3,
      inDate: parseDateDMY('01/01/2024'),
      customerName: 'BASHIR CHANIYA',
      workType: 'TRUCK CF',
      vehicleType: 'TRUCK',
      vehicleNo: 'GJ36T3452',
      vehicleNumber: 'GJ36T3452',
      amount: 3000,
      fees: 3000,
      jama: 3000,
      baki: 0,
      mobileNo: '9265054138',
      insuranceByTorque: 'NO',
      remarks: 'WORK HAS BEEN DONE ON SAME DAY',
      status: 'completed'
    },
    {
      srNo: 4,
      inDate: parseDateDMY('02/01/2024'),
      customerName: 'ISABHAI THEBA',
      workType: 'INS AND CF',
      vehicleType: 'AAKHARI SAFAR',
      vehicleNo: 'GJ03BY1289',
      vehicleNumber: 'GJ03BY1289',
      amount: 10000,
      fees: 10000,
      jama: 10000,
      baki: 0,
      mobileNo: '9879563700',
      insuranceByTorque: 'DONE',
      remarks: 'INS RECEIVED 10 01 2024 A CF THASE',
      status: 'in_progress'
    },
    {
      srNo: 5,
      inDate: parseDateDMY('03/01/2024'),
      customerName: 'ASHRAF ABHRAM DAVALIYA',
      workType: 'TO',
      vehicleType: 'COMMERCIAL',
      vehicleNo: 'GJ01SE3554',
      vehicleNumber: 'GJ01SE3554',
      amount: 2000,
      fees: 2000,
      jama: 2000,
      baki: 0,
      mobileNo: '9978294699',
      insuranceByTorque: 'NO',
      remarks: 'INS COPY VISIBLE NATHI ATLE PDF KARI APVI',
      status: 'completed'
    },
    {
      srNo: 6,
      inDate: parseDateDMY('03/01/2024'),
      customerName: 'FIROJ HAJIBHAI MAJOTHI',
      workType: 'TO CF HPT',
      vehicleType: 'CAR',
      vehicleNo: 'GJ01RU1672',
      vehicleNumber: 'GJ01RU1672',
      amount: 21000,
      fees: 21000,
      jama: 21000,
      baki: 0,
      mobileNo: '9825346894',
      insuranceByTorque: 'PENDING',
      remarks: 'HOLD MA RAKHVU',
      status: 'pending'
    }
  ]

  for (const rto of rtoRecords) {
    const existing = await prisma.rTOWork.findFirst({
      where: { vehicleNo: rto.vehicleNo }
    })
    if (existing) {
      await prisma.rTOWork.update({
        where: { id: existing.id },
        data: rto
      })
    } else {
      await prisma.rTOWork.create({
        data: rto
      })
    }
  }
  console.log(`Seeded / updated ${rtoRecords.length} Vehicle RTO Work records.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
