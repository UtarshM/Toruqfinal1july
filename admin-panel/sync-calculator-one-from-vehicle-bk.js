const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseSqlInserts(content, tableName) {
  const startIdx = content.indexOf(`-- Dumping data for table \`${tableName}\``);
  if (startIdx === -1) return [];

  const endIdx = content.indexOf('-- --------------------------------------------------------', startIdx);
  const block = content.substring(startIdx, endIdx !== -1 ? endIdx : content.length);

  const insertMatch = block.match(/INSERT INTO `[^`]+` \(([^)]+)\) VALUES\s*([\s\S]+?);/);
  if (!insertMatch) return [];

  const columns = insertMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
  const valuesBlob = insertMatch[2];

  const rows = [];
  const tupleRegex = /\(([^()]+(?:\([^()]*\)[^()]*)*)\)/g;
  let match;

  while ((match = tupleRegex.exec(valuesBlob)) !== null) {
    const rawFields = match[1];
    const fields = [];
    let cur = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < rawFields.length; i++) {
      const char = rawFields[i];
      if ((char === "'" || char === '"') && (i === 0 || rawFields[i - 1] !== '\\')) {
        if (!inQuote) {
          inQuote = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuote = false;
        } else {
          cur += char;
        }
      } else if (char === ',' && !inQuote) {
        fields.push(cur.trim().replace(/^['"]|['"]$/g, '').replace(/\\'/g, "'"));
        cur = '';
      } else {
        cur += char;
      }
    }
    if (cur.trim()) {
      fields.push(cur.trim().replace(/^['"]|['"]$/g, '').replace(/\\'/g, "'"));
    }

    const rowObj = {};
    columns.forEach((col, idx) => {
      rowObj[col] = fields[idx];
    });
    rows.push(rowObj);
  }

  return rows;
}

async function syncCalculatorOneRules() {
  console.log('--- Starting Sync of Vehicle-BK Calculator 1 Margin Conditions ---');
  const sqlPath = path.join(__dirname, '../vehicle-bk/db/happyh50_vehicleinsurance.sql');
  const content = fs.readFileSync(sqlPath, 'utf8');

  const rawCompanies = parseSqlInserts(content, 'company_detail');
  const rawCategories = parseSqlInserts(content, 'category_detail');
  const rawQutrelOne = parseSqlInserts(content, 'qutrel_one_detail');

  const cmpRawMap = new Map(rawCompanies.map(c => [c.cmp_id, c]));
  const ctgRawMap = new Map(rawCategories.map(c => [c.ctg_id, c]));

  // Strictly active rules from qutrel_one_detail
  const activeRulesOne = rawQutrelOne.filter(r => r.qtr_status === '1');
  console.log(`Found ${activeRulesOne.length} active rules in qutrel_one_detail.`);

  // 1. Set all current quotation relationships to inactive first to avoid stale or qutrel_two overwrites
  await prisma.quotationRelationship.updateMany({
    data: { status: 2 }
  });
  // Also deactivate companies/categories initially so only Calculator 1 ones are active (status = 1)
  await prisma.companyDetail.updateMany({
    data: { status: 2 }
  });
  await prisma.categoryDetail.updateMany({
    data: { status: 2 }
  });

  const activeCompanyNames = new Set();
  const activeCategoryNames = new Set();

  let created = 0;
  let updated = 0;

  for (const rule of activeRulesOne) {
    const rawCmp = cmpRawMap.get(rule.cmp_id);
    const rawCtg = ctgRawMap.get(rule.ctg_id);

    if (!rawCmp || !rawCtg) {
      console.warn(`Could not find company or category for rule id=${rule.qtr_id}`);
      continue;
    }

    const cmpName = rawCmp.cmp_name.trim();
    const ctgName = rawCtg.ctg_name.trim();

    activeCompanyNames.add(cmpName);
    activeCategoryNames.add(ctgName);

    // Upsert Company
    let company = await prisma.companyDetail.findUnique({ where: { name: cmpName } });
    if (!company) {
      company = await prisma.companyDetail.create({
        data: { name: cmpName, status: 1 }
      });
    } else {
      company = await prisma.companyDetail.update({
        where: { id: company.id },
        data: { status: 1 }
      });
    }

    // Upsert Category
    let category = await prisma.categoryDetail.findUnique({ where: { name: ctgName } });
    if (!category) {
      category = await prisma.categoryDetail.create({
        data: { name: ctgName, status: 1 }
      });
    } else {
      category = await prisma.categoryDetail.update({
        where: { id: category.id },
        data: { status: 1 }
      });
    }

    const percentage = parseFloat(rule.qtr_percentage) || 0;
    const profit = parseFloat(rule.qtr_profit) || 0;
    const remarks = (rule.qtr_remarks || '').trim();

    // Check if relationship exists for this company + category
    const existing = await prisma.quotationRelationship.findFirst({
      where: { companyId: company.id, categoryId: category.id }
    });

    if (existing) {
      await prisma.quotationRelationship.update({
        where: { id: existing.id },
        data: {
          percentage,
          profit,
          remarks,
          status: 1
        }
      });
      updated++;
    } else {
      await prisma.quotationRelationship.create({
        data: {
          companyId: company.id,
          categoryId: category.id,
          percentage,
          profit,
          remarks,
          status: 1
        }
      });
      created++;
    }
  }

  console.log(`Sync Completed: Created=${created}, Updated=${updated}`);
  const finalActiveCmps = await prisma.companyDetail.count({ where: { status: 1 } });
  const finalActiveCtgs = await prisma.categoryDetail.count({ where: { status: 1 } });
  const finalActiveRels = await prisma.quotationRelationship.count({ where: { status: 1 } });

  console.log(`Final Active Database Counts: Companies=${finalActiveCmps}, Categories=${finalActiveCtgs}, Relationships=${finalActiveRels}`);

  // Display all active rules
  const allActive = await prisma.quotationRelationship.findMany({
    where: { status: 1 },
    include: { company: true, category: true },
    orderBy: { company: { name: 'asc' } }
  });

  console.log('\n--- Active Rate Calculator 1 Rules ---');
  console.table(allActive.map((r, i) => ({
    No: i + 1,
    Company: r.company.name,
    Category: r.category.name,
    '%': r.percentage.toString(),
    Profit: r.profit.toString(),
    Remarks: r.remarks
  })));
}

syncCalculatorOneRules()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
