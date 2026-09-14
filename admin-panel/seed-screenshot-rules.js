const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const screenshotRules = [
  {
    company: "ROYAL SUNDARAM 7500-12000 GVW NIL DEP AND NORMAL",
    category: "ROYAL SUNDARAM 7500-12000 GVW NIL DEP AND NORMAL",
    percentage: 22,
    profit: 5500,
    remarks: "Nil dep koi to 1000 plus karna 5,500 hey to 2000 plus karna"
  },
  {
    company: "ROYAL SUNDARAM 20000-40000 GVW NIL DEP",
    category: "ROYAL SUNDARAM 20000-40000 GVW NIL DEP",
    percentage: 30,
    profit: 4500,
    remarks: "TATA & AL DISCOUNT 90% OTHRH MAKE DISCOUNT 85%. GJD hey to RATE ma 3000 plus karvo. TATA & AL sivay na model no RATE ma 1500 plus karva"
  },
  {
    company: "ROYAL SUNDARAM 20000-40000 GVW NORMAL",
    category: "ROYAL SUNDARAM 20000-40000 GVW NORMAL",
    percentage: 32,
    profit: 4000,
    remarks: "TATA & AL DISCOUNT 90% OTHRH MAKE DISCOUNT 85%. GJD hey to RATE ma 2000 plus karvo. TATA & AL sivay na model no RATE ma 1000 plus karva"
  },
  {
    company: "ROYAL SUNDARAM 12000-20000 GVW NIL DEP",
    category: "ROYAL SUNDARAM 12000-20000 GVW NIL DEP",
    percentage: 26,
    profit: 4000,
    remarks: "TATA & AL DISCOUNT 90% OTHRH MAKE DISCOUNT 85%. GJD hey to RATE ma 1500 plus karvo. TATA & AL sivay na model no RATE ma 1000 plus karva"
  },
  {
    company: "ROYAL SUNDARAM 12000-20000 GVW NORMAL",
    category: "ROYAL SUNDARAM 12000-20000 GVW NORMAL",
    percentage: 30,
    profit: 3500,
    remarks: "TATA & AL DISCOUNT 90% OTHRH MAKE DISCOUNT 85%. GJD hey to RATE ma 1000 plus karvo. TATA & AL sivay na model no RATE ma 1000 plus karva"
  },
  {
    company: "ORIENTAL 3500-7500 NIL DEP AND NORMAL",
    category: "ORIENTAL 3500-7500 NIL DEP AND NORMAL",
    percentage: 33,
    profit: 4500,
    remarks: "QUOTE FROM SYSTEM, ALL MODEL ALL RTO. ICICI ma no hoy aavata karvi"
  },
  {
    company: "STAFF BUS (ANY COMPANY) TP & FULL",
    category: "STAFF BUS (ANY COMPANY) TP & FULL",
    percentage: 46,
    profit: 5000,
    remarks: "DISCOUNT 90% IN FULL POLICY"
  },
  {
    company: "CHOLA 0-2500 GVW NIL DEP AND NORMAL RATE FOR SPECIAL MODEL",
    category: "CHOLA 0-2500 GVW NIL DEP AND NORMAL RATE FOR SPECIAL MODEL",
    percentage: 50,
    profit: 4500,
    remarks: "Applicable For: Ace, Super Ace, Radha Xenon, Magic, Intra, Super Carry, Mahindra Jeeto, Tractor, Supro"
  },
  {
    company: "SHRIRAM 42501-55000 GVW NIL DEP AND NORMAL",
    category: "SHRIRAM 42501-55000 GVW NIL DEP AND NORMAL",
    percentage: 10,
    profit: 5500,
    remarks: "ALL MODELS ALL RTO, DISCOUNT 90%, tanker hey to 1500 plus karva"
  },
  {
    company: "SHRIRAM 7500-12000 GVW NIL DEP AND NORMAL",
    category: "SHRIRAM 7500-12000 GVW NIL DEP AND NORMAL",
    percentage: 35,
    profit: 5500,
    remarks: "ALL MODELS ALL RTO, DISCOUNT 90%"
  },
  {
    company: "SHRIRAM 2801-3500 GVW NIL DEP AND NORMAL",
    category: "SHRIRAM 2801-3500 GVW NIL DEP AND NORMAL",
    percentage: 55,
    profit: 4500,
    remarks: "ALL MODELS ALL RTO, DISCOUNT 85%, Inspection Required if Previous Policy Expired"
  },
  {
    company: "INDUSIND/RELIANCE 0-2500 GVW NIL DEP AND NORMAL",
    category: "INDUSIND/RELIANCE 0-2500 GVW NIL DEP AND NORMAL",
    percentage: 59,
    profit: 4500,
    remarks: "ALL MAKE MODEL ALL RTOs"
  },
  {
    company: "UNIVERSAL SOMPO ABOVE 45000 GVW NIL DEP AND NORMAL",
    category: "UNIVERSAL SOMPO ABOVE 45000 GVW NIL DEP AND NORMAL",
    percentage: 25,
    profit: 6500,
    remarks: "ALL MAKE MODEL ALL RTO DISCOUNT 90%, BAAJATEEN ZOG DLINED"
  },
  {
    company: "UNIVERSAL SOMPO 20001-45000 GVW NIL DEP AND NORMAL",
    category: "UNIVERSAL SOMPO 20001-45000 GVW NIL DEP AND NORMAL",
    percentage: 28,
    profit: 6000,
    remarks: "ALL MAKE MODEL ALL RTO DISCOUNT 90%, BAAJATEEN ZOG DLINED"
  },
  {
    company: "CHOLA 7500-20000 GVW NIL DEP AND NORMAL",
    category: "CHOLA 7500-20000 GVW NIL DEP AND NORMAL",
    percentage: 30,
    profit: 5000,
    remarks: "CONFIRM DISCOUNT FROM SYSTEM"
  },
  {
    company: "SBI ABOVE 40000 GVW NIL DEP AND NORMAL",
    category: "SBI ABOVE 40000 GVW NIL DEP AND NORMAL",
    percentage: 14,
    profit: 5500,
    remarks: "DISCOUNT 85%"
  },
  {
    company: "SHRIRAM 3500-7500 GVW NIL DEP AND NORMAL",
    category: "SHRIRAM 3500-7500 GVW NIL DEP AND NORMAL",
    percentage: 37,
    profit: 5500,
    remarks: "ONLY WITH NCB CASES DISCOUNT 90%, GJ 05 DECLINED"
  },
  {
    company: "SBI 12000-40000 GVW BELOW 1 YEAR NIL DEP AND NORMAL",
    category: "SBI 12000-40000 GVW BELOW 1 YEAR NIL DEP AND NORMAL",
    percentage: 21,
    profit: 5500,
    remarks: "ALL RTO, TATA AND AL ONLY, DISCOUNT 85% Nil dep quote from system"
  },
  {
    company: "FUTURE 3500-7500 GVW NIL DEP AND NORMAL",
    category: "FUTURE 3500-7500 GVW NIL DEP AND NORMAL",
    percentage: 35,
    profit: 5000,
    remarks: "DECLINED RTO - GJ 05, 17, 20, 25, 38"
  },
  {
    company: "SHRIRAM 15 YEARS OLD 7500-42500 GVW",
    category: "SHRIRAM 15 YEARS OLD 7500-42500 GVW",
    percentage: 20,
    profit: 5000,
    remarks: ""
  },
  {
    company: "SHRIRAM 15 YEARS OLD 0-2800 GVW",
    category: "SHRIRAM 15 YEARS OLD 0-2800 GVW",
    percentage: 50,
    profit: 4500,
    remarks: ""
  },
  {
    company: "SBI 2500-3500 GVW NIL DEP AND NORMAL",
    category: "SBI 2500-3500 GVW NIL DEP AND NORMAL",
    percentage: 53,
    profit: 4500,
    remarks: "ALL MAKE MODEL ALL RTO"
  },
  {
    company: "ICICI 2500-3500 GVW NIL DEP AND NORMAL",
    category: "ICICI 2500-3500 GVW NIL DEP AND NORMAL",
    percentage: 50,
    profit: 4500,
    remarks: "DISCOUNT 90%, DECLINE RTO AUTHORITY (AHMEDABAD, BARODA, SURAT, RAJKOT, GANDHINAGAR)"
  },
  {
    company: "SHRIRAM ABOVE 55000 GVW NIL DEP AND NORMAL",
    category: "SHRIRAM ABOVE 55000 GVW NIL DEP AND NORMAL",
    percentage: 10,
    profit: 5500,
    remarks: "DISCOUNT 75% TATA, AL AND ICICI 03"
  },
  {
    company: "UNIVERSAL SOMPO 3500-20000 GVW NIL DEP AND NORMAL",
    category: "UNIVERSAL SOMPO 3500-20000 GVW NIL DEP AND NORMAL",
    percentage: 34,
    profit: 5500,
    remarks: "ALL MAKE MODEL ALL RTO DISCOUNT 90%, BAAJATEEN ZOG DLINED"
  },
  {
    company: "LIBERTY 0-2500 GVW NORMAL AND NIL DEP",
    category: "LIBERTY 0-2500 GVW NORMAL AND NIL DEP",
    percentage: 60,
    profit: 4500,
    remarks: "ALL MAKE DISCOUNT 90% FOR DDO, HOD RTO CHECK IN SYSTEM"
  },
  {
    company: "SCHOOL BUS (ANY COMPANY) TP & FULL",
    category: "SCHOOL BUS (ANY COMPANY) TP & FULL",
    percentage: 72,
    profit: 2500,
    remarks: "DISCOUNT 90%, NIL DEP NOT APPLICABLE ALWAYS NORMAL POLICY"
  },
  {
    company: "ICICI 12000-55000 GVW NIL DEP AND NORMAL",
    category: "ICICI 12000-55000 GVW NIL DEP AND NORMAL",
    percentage: 19,
    profit: 5500,
    remarks: "DISCOUNT 85-90% DECLINED RTO (AHMEDABAD, BARODA, SURAT, RAJKOT, GANDHINAGAR) PETROL, DIESEL, GAS TANKER ALLOWED"
  },
  {
    company: "TAXI NIL DEP NORMAL RELIANCE / SHRIRAM/SBI",
    category: "TAXI NIL DEP NORMAL RELIANCE / SHRIRAM/SBI",
    percentage: 20,
    profit: 4000,
    remarks: "Discount 70%"
  },
  {
    company: "GODIGIT 20000-43000 GVW ABOVE 1 YEAR",
    category: "GODIGIT 20000-43000 GVW ABOVE 1 YEAR",
    percentage: 24,
    profit: 5000,
    remarks: "DISCOUNT 85% ALL MAKE MODEL SPECIAL FOR BHARATBENZ"
  },
  {
    company: "ICICI 3500-7500 GVW NILDEP AND NORMAL",
    category: "ICICI 3500-7500 GVW NILDEP AND NORMAL",
    percentage: 42,
    profit: 5000,
    remarks: "DISCOUNT 88% ALL MAKE MODEL, DECLINE RTO: AHMEDABAD, BARODA, SURAT, RAJKOT, GANDHINAGAR"
  },
  {
    company: "CHOLA 20000-40000 GVW NIL DEP AND NORMAL",
    category: "CHOLA 20000-40000 GVW NIL DEP AND NORMAL",
    percentage: 32,
    profit: 4500,
    remarks: "ALL MAKE ALL RTO, DISCOUNT 87.5% FOR BHARATBENZ DISCOUNT 85%"
  },
  {
    company: "SHRIRAM 12001-42500 GVW NIL DEP & NORMAL",
    category: "SHRIRAM 12001-42500 GVW NIL DEP & NORMAL",
    percentage: 27,
    profit: 5500,
    remarks: "ALL MODELS ALL RTO, DISCOUNT 90%, tanker hey to 1500 plus karva"
  },
  {
    company: "SBI 12000-40000 GVW NORMAL ABOVE 5 YEAR",
    category: "SBI 12000-40000 GVW NORMAL ABOVE 5 YEAR",
    percentage: 37,
    profit: 4000,
    remarks: "ALL RTO, TATA AND AL ONLY, DISCOUNT 90%, UPTO 20 YEARS ALLOWED"
  },
  {
    company: "SB 0-2500 GVW NIL DEP AND NORMAL",
    category: "SB 0-2500 GVW NIL DEP AND NORMAL",
    percentage: 64,
    profit: 4500,
    remarks: "UPTO 2500 GVW IF TATA MODEL, ALL MODELS ALL RTO, DISCOUNT 90%"
  },
  {
    company: "SHRIRAM 0-2800 GVW NIL DEP AND NORMAL",
    category: "SHRIRAM 0-2800 GVW NIL DEP AND NORMAL",
    percentage: 62,
    profit: 4500,
    remarks: "ALL MODELS ALL RTO, DISCOUNT 85%, Inspection Required if Previous Policy Expired"
  },
  {
    company: "CHOLA 2501-3500 GVW NIL DEP AND NORMAL",
    category: "CHOLA 2501-3500 GVW NIL DEP AND NORMAL",
    percentage: 50,
    profit: 4500,
    remarks: "ALL MODELS ALL RTOs, DISCOUNT 85%, 1% CESS Rs. 550/- Compulsory"
  }
];

async function seedScreenshotRules() {
  console.log(`Starting to seed ${screenshotRules.length} rules from user screenshot...`);

  let seededCount = 0;
  for (const item of screenshotRules) {
    const compName = item.company.trim();
    const catName = item.category.trim();

    // 1. Ensure company exists
    let comp = await prisma.companyDetail.findUnique({ where: { name: compName } });
    if (!comp) {
      comp = await prisma.companyDetail.create({
        data: { name: compName, status: 1 }
      });
    }

    // 2. Ensure category exists
    let cat = await prisma.categoryDetail.findUnique({ where: { name: catName } });
    if (!cat) {
      cat = await prisma.categoryDetail.create({
        data: { name: catName, status: 1 }
      });
    }

    // 3. Upsert relationship
    const existing = await prisma.quotationRelationship.findFirst({
      where: {
        companyId: comp.id,
        categoryId: cat.id,
        status: 1
      }
    });

    if (existing) {
      await prisma.quotationRelationship.update({
        where: { id: existing.id },
        data: {
          percentage: item.percentage,
          profit: item.profit,
          remarks: item.remarks,
          status: 1
        }
      });
    } else {
      await prisma.quotationRelationship.create({
        data: {
          companyId: comp.id,
          categoryId: cat.id,
          percentage: item.percentage,
          profit: item.profit,
          remarks: item.remarks,
          status: 1
        }
      });
    }
    seededCount++;
  }

  console.log(`Successfully seeded/updated ${seededCount} screenshot rules!`);

  const totalComps = await prisma.companyDetail.count();
  const totalCats = await prisma.categoryDetail.count();
  const totalRels = await prisma.quotationRelationship.count();

  console.log({ totalComps, totalCats, totalRels });
}

seedScreenshotRules()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
