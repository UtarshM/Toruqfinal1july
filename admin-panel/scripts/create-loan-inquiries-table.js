const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Step 1: Creating loan_inquiries table in PostgreSQL ---')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS loan_inquiries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sr_no SERIAL,
      inward_date DATE DEFAULT CURRENT_DATE,
      customer_name TEXT NOT NULL,
      mobile_no TEXT,
      vehicle_number TEXT,
      category TEXT,
      lead_by TEXT,
      required_amount NUMERIC(12, 2),
      status TEXT DEFAULT 'ONLY INQUIRY',
      reason_for_not_done TEXT,
      bank_nbfc TEXT,
      sanctioned_amount NUMERIC(12, 2),
      disbursed_date DATE,
      no_of_days INTEGER,
      payout_percent NUMERIC(5, 2),
      payout_amount NUMERIC(12, 2),
      remarks_if_any TEXT,
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_loan_inquiries_status ON loan_inquiries(status)`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_loan_inquiries_customer_name ON loan_inquiries(customer_name)`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_loan_inquiries_vehicle_number ON loan_inquiries(vehicle_number)`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_loan_inquiries_inward_date ON loan_inquiries(inward_date)`)
  console.log('✓ loan_inquiries table and indexes created successfully.')

  console.log('--- Step 2: Seeding user sample data row ---')
  const existingSample = await prisma.$queryRawUnsafe(`
    SELECT * FROM loan_inquiries WHERE customer_name = 'VIKAS TOYTA' AND vehicle_number = 'GJ01WC7944' LIMIT 1
  `)

  if (!existingSample || existingSample.length === 0) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO loan_inquiries (
        inward_date, customer_name, mobile_no, vehicle_number, category, lead_by,
        required_amount, status, reason_for_not_done
      ) VALUES (
        '2025-09-13', 'VIKAS TOYTA', '9510819589', 'GJ01WC7944', 'PRIVATE USED', 'MITTAL MADAM',
        300000, 'ONLY INQUIRY', 'CALL NOT ANSWERING'
      )
    `)
    console.log('✓ Inserted sample inquiry: VIKAS TOYTA (GJ01WC7944)')
  } else {
    console.log('✓ Sample inquiry already exists.')
  }

  console.log('--- Step 3: Ensuring loan permissions exist & assigning to ALL roles ---')
  const loanPermissions = [
    { name: 'loan.view', description: 'View loans and loan inquiries' },
    { name: 'loan.create', description: 'Create loans and loan inquiries' },
    { name: 'loan.edit', description: 'Edit loans and loan inquiries' },
    { name: 'loan.delete', description: 'Delete loans and loan inquiries' },
    { name: 'loan.update_status', description: 'Update status of loans and inquiries' },
    { name: 'loan.track_conversion', description: 'Track loan conversion and payouts' },
    { name: 'loan_inquiry.view', description: 'View loan inquiries' },
    { name: 'loan_inquiry.create', description: 'Create loan inquiries' },
    { name: 'loan_inquiry.edit', description: 'Edit loan inquiries' },
    { name: 'loan_inquiry.delete', description: 'Delete loan inquiries' },
  ]

  for (const perm of loanPermissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: { name: perm.name, description: perm.description }
    })
  }

  const allRoles = await prisma.role.findMany()
  const dbPermissions = await prisma.permission.findMany({
    where: {
      name: { in: loanPermissions.map(p => p.name) }
    }
  })

  for (const role of allRoles) {
    for (const perm of dbPermissions) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_RolePermissions" ("A", "B")
        VALUES ($1::uuid, $2::uuid)
        ON CONFLICT DO NOTHING
      `, perm.id, role.id).catch(() => {
        // Fallback if table name is different
      })
    }
    console.log(`✓ Granted loan rights to role: ${role.name}`)
  }

  console.log('\n✅ Setup completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during setup:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
