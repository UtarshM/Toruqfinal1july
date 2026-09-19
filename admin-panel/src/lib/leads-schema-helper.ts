import prisma from '@/lib/prisma'

let leadsSchemaHealed = false

const STATEMENTS = [
  'ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "vehicleNoNormalized" VARCHAR(32)',
  'CREATE INDEX IF NOT EXISTS "leads_vehicleNoNormalized_idx" ON "leads"("vehicleNoNormalized")',
  'ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)',
  'ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "deletedBy" UUID',
  'ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "importName" TEXT',
  'ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT \'{}\'',
  'ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "messageTemplate" TEXT',
  'ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "existingAgent" TEXT',
  'ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "city" TEXT',
  'ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "gvw" TEXT',
  'ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "address" TEXT',
  'ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3)',
  'ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "registrationDate" TIMESTAMP(3)',
  'CREATE INDEX IF NOT EXISTS "leads_deletedAt_idx" ON "leads"("deletedAt")',
  'CREATE INDEX IF NOT EXISTS "leads_expiryDate_idx" ON "leads"("expiryDate")',
  'CREATE INDEX IF NOT EXISTS "leads_assignedTo_idx" ON "leads"("assignedTo")',
  'CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads"("status")'
]

export async function healLeadsSchema(force = false) {
  if (leadsSchemaHealed && !force) return
  for (const stmt of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(stmt)
    } catch (e: any) {
      if (!e?.message?.includes('already exists')) {
        console.warn('[healLeadsSchema] Notice:', stmt, e?.message)
      }
    }
  }
  leadsSchemaHealed = true
}
