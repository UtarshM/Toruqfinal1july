import prisma from '@/lib/prisma'

/**
 * High-performance atomic deletion of ALL leads in the database and their cascading child records.
 * Uses a single PostgreSQL transaction to prevent serverless function timeouts.
 */
export async function purgeAllLeadsWithCascade(): Promise<number> {
  const result = await prisma.$transaction([
    prisma.$executeRawUnsafe(`DELETE FROM "data_change_requests" WHERE "entityType" = 'Lead'`),
    prisma.$executeRawUnsafe(`DELETE FROM "lead_assignments"`),
    prisma.$executeRawUnsafe(`DELETE FROM "lead_status_history"`),
    prisma.$executeRawUnsafe(`DELETE FROM "lead_whatsapp_logs"`),
    prisma.$executeRawUnsafe(`DELETE FROM "calls" WHERE "leadId" IS NOT NULL`),
    prisma.$executeRawUnsafe(`DELETE FROM "follow_ups" WHERE "leadId" IS NOT NULL`),
    prisma.$executeRawUnsafe(`DELETE FROM "quotations" WHERE "leadId" IS NOT NULL`),
    prisma.$executeRawUnsafe(`DELETE FROM "claims" WHERE "leadId" IS NOT NULL`),
    prisma.$executeRawUnsafe(`DELETE FROM "transactions" WHERE "leadId" IS NOT NULL`),
    prisma.$executeRawUnsafe(`DELETE FROM "visits" WHERE "leadId" IS NOT NULL`),
    prisma.$executeRawUnsafe(`DELETE FROM "rto_work" WHERE "leadId" IS NOT NULL`),
    prisma.$executeRawUnsafe(`DELETE FROM "fitness_work" WHERE "leadId" IS NOT NULL`),
    prisma.$executeRawUnsafe(`DELETE FROM "loans" WHERE "leadId" IS NOT NULL`),
    prisma.$executeRawUnsafe(`DELETE FROM "renewal_records" WHERE "leadId" IS NOT NULL`),
    prisma.$executeRawUnsafe(`DELETE FROM "customers" WHERE "leadId" IS NOT NULL`),
    prisma.$executeRawUnsafe(`UPDATE "policies" SET "leadId" = NULL WHERE "leadId" IS NOT NULL`),
    prisma.$executeRawUnsafe(`DELETE FROM "activity_logs" WHERE "entityId" IN (SELECT id FROM "leads")`),
    prisma.$executeRawUnsafe(`DELETE FROM "leads"`)
  ])
  return Number(result[result.length - 1] || 0)
}

/**
 * High-performance atomic deletion of leads belonging to a specific batch / sheet.
 * Uses a subquery inside a single PostgreSQL transaction.
 */
export async function deleteLeadsByBatchWithCascade(batchName: string | null): Promise<number> {
  let leadSubquery = `SELECT id FROM "leads" WHERE "importName" IS NULL`
  if (batchName !== null) {
    const escapedBatch = batchName.replace(/'/g, "''")
    const cleanBatch = batchName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    leadSubquery = `SELECT id FROM "leads" WHERE "importName" = '${escapedBatch}' OR LOWER(REGEXP_REPLACE(COALESCE("importName", ''), '[^a-zA-Z0-9]', '', 'g')) = '${cleanBatch}'`
  }

  const result = await prisma.$transaction([
    prisma.$executeRawUnsafe(`DELETE FROM "data_change_requests" WHERE "entityType" = 'Lead' AND "entityId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "lead_assignments" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "lead_status_history" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "lead_whatsapp_logs" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "calls" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "follow_ups" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "quotations" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "claims" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "transactions" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "visits" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "rto_work" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "fitness_work" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "loans" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "renewal_records" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "customers" WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`UPDATE "policies" SET "leadId" = NULL WHERE "leadId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "activity_logs" WHERE "entityId" IN (${leadSubquery})`),
    prisma.$executeRawUnsafe(`DELETE FROM "leads" WHERE id IN (${leadSubquery})`)
  ])
  return Number(result[result.length - 1] || 0)
}

/**
 * Safely deletes leads by removing or unlinking all foreign-key dependent records first.
 * Uses high-speed atomic transactions in chunks of 2,000 IDs to stay well within timeout limits.
 */
export async function deleteLeadsWithCascade(leadIds: string[]): Promise<number> {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return 0
  }

  // Deduplicate IDs and ensure valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const uniqueIds = Array.from(new Set(leadIds.filter(id => id && uuidRegex.test(String(id).trim()))))
  if (uniqueIds.length === 0) return 0

  const CHUNK_SIZE = 2000
  let totalDeleted = 0

  for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + CHUNK_SIZE)
    const list = chunk.map(id => `'${id}'::uuid`).join(', ')

    const res = await prisma.$transaction([
      prisma.$executeRawUnsafe(`DELETE FROM "data_change_requests" WHERE "entityType" = 'Lead' AND "entityId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "lead_assignments" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "lead_status_history" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "lead_whatsapp_logs" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "calls" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "follow_ups" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "quotations" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "claims" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "transactions" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "visits" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "rto_work" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "fitness_work" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "loans" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "renewal_records" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "customers" WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`UPDATE "policies" SET "leadId" = NULL WHERE "leadId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "activity_logs" WHERE "entityId" IN (${list})`),
      prisma.$executeRawUnsafe(`DELETE FROM "leads" WHERE id IN (${list})`)
    ]).catch(err => {
      console.error('[deleteLeadsWithCascade] transaction error:', err?.message)
      return [0]
    })

    totalDeleted += Number(res[res.length - 1] || 0)
  }

  return totalDeleted
}
