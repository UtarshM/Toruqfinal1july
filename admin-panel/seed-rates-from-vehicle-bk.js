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

async function seed() {
  const sqlPath = path.join(__dirname, '../vehicle-bk/db/happyh50_vehicleinsurance.sql');
  const content = fs.readFileSync(sqlPath, 'utf8');

  const rawCompanies = parseSqlInserts(content, 'company_detail');
  const rawCategories = parseSqlInserts(content, 'category_detail');
  const rawQutrelOne = parseSqlInserts(content, 'qutrel_one_detail');
  const rawQutrelTwo = parseSqlInserts(content, 'qutrel_two_detail');

  const cmpRawMap = new Map(rawCompanies.map(c => [c.cmp_id, c]));
  const ctgRawMap = new Map(rawCategories.map(c => [c.ctg_id, c]));

  const activeRulesOne = rawQutrelOne.filter(r => r.qtr_status === '1');
  const activeRulesTwo = rawQutrelTwo.filter(r => r.qtr_status === '1');
  const allActiveRules = [...activeRulesOne, ...activeRulesTwo];

  const neededCmpIds = new Set(rawCompanies.filter(c => c.cmp_status === '1').map(c => c.cmp_id));
  const neededCtgIds = new Set(rawCategories.filter(c => c.ctg_status === '1').map(c => c.ctg_id));

  allActiveRules.forEach(r => {
    neededCmpIds.add(r.cmp_id);
    neededCtgIds.add(r.ctg_id);
  });

  // 1. Seed Companies
  console.log('Seeding Companies...');
  const companyNameToIdMap = new Map();
  const companyRawIdToPrismaIdMap = new Map();

  for (const cmpId of neededCmpIds) {
    const rawCmp = cmpRawMap.get(cmpId);
    if (!rawCmp) continue;
    const name = rawCmp.cmp_name.trim();

    if (companyNameToIdMap.has(name)) {
      companyRawIdToPrismaIdMap.set(cmpId, companyNameToIdMap.get(name));
      continue;
    }

    let company = await prisma.companyDetail.findUnique({ where: { name } });
    if (!company) {
      company = await prisma.companyDetail.create({
        data: { name, status: 1 }
      });
    } else if (company.status !== 1) {
      company = await prisma.companyDetail.update({
        where: { id: company.id },
        data: { status: 1 }
      });
    }

    companyNameToIdMap.set(name, company.id);
    companyRawIdToPrismaIdMap.set(cmpId, company.id);
  }
  console.log(`Seeded ${companyNameToIdMap.size} unique companies into CompanyDetail.`);

  // 2. Seed Categories
  console.log('Seeding Categories...');
  const categoryNameToIdMap = new Map();
  const categoryRawIdToPrismaIdMap = new Map();

  for (const ctgId of neededCtgIds) {
    const rawCtg = ctgRawMap.get(ctgId);
    if (!rawCtg) continue;
    const name = rawCtg.ctg_name.trim();

    if (categoryNameToIdMap.has(name)) {
      categoryRawIdToPrismaIdMap.set(ctgId, categoryNameToIdMap.get(name));
      continue;
    }

    let category = await prisma.categoryDetail.findUnique({ where: { name } });
    if (!category) {
      category = await prisma.categoryDetail.create({
        data: { name, status: 1 }
      });
    } else if (category.status !== 1) {
      category = await prisma.categoryDetail.update({
        where: { id: category.id },
        data: { status: 1 }
      });
    }

    categoryNameToIdMap.set(name, category.id);
    categoryRawIdToPrismaIdMap.set(ctgId, category.id);
  }
  console.log(`Seeded ${categoryNameToIdMap.size} unique categories into CategoryDetail.`);

  // 3. Seed Quotation Relationships
  console.log('Seeding Quotation Relationships...');
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const rule of allActiveRules) {
    const companyId = companyRawIdToPrismaIdMap.get(rule.cmp_id);
    const categoryId = categoryRawIdToPrismaIdMap.get(rule.ctg_id);

    if (!companyId || !categoryId) {
      console.warn(`Missing mapping for cmp_id=${rule.cmp_id}, ctg_id=${rule.ctg_id}`);
      continue;
    }

    const percentage = parseFloat(rule.qtr_percentage) || 0;
    const profit = parseFloat(rule.qtr_profit) || 0;
    const remarks = (rule.qtr_remarks || '').trim();

    try {
      const existing = await prisma.quotationRelationship.findFirst({
        where: { companyId, categoryId, status: { in: [1, 2] } }
      });

      if (existing) {
        await prisma.quotationRelationship.update({
          where: { id: existing.id },
          data: { percentage, profit, remarks, status: 1 }
        });
        updated++;
      } else {
        await prisma.quotationRelationship.create({
          data: { companyId, categoryId, percentage, profit, remarks, status: 1 }
        });
        created++;
      }
    } catch (err) {
      console.error(`Error saving rule (cmp=${rule.cmp_id}, ctg=${rule.ctg_id}):`, err.message);
      errors++;
    }
  }

  console.log(`Summary: Created=${created}, Updated=${updated}, Errors=${errors}`);

  const finalCmp = await prisma.companyDetail.count({ where: { status: 1 } });
  const finalCtg = await prisma.categoryDetail.count({ where: { status: 1 } });
  const finalRel = await prisma.quotationRelationship.count({ where: { status: 1 } });

  console.log(`Final Database Counts: Companies=${finalCmp}, Categories=${finalCtg}, Relationships=${finalRel}`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
