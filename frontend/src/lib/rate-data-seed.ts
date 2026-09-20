/**
 * Auto-generated seed data for Rate Calculator and Companies master.
 * Enables 100% offline, 0ms instant rendering on all devices.
 */

export interface RateCompanySeed {
  id: string;
  name: string;
  status: number;
}

export interface RateRelationshipSeed {
  id: string;
  companyId: string;
  categoryId?: string;
  percentage: number;
  profit: number;
  remarks: string;
  status: number;
  companyName?: string;
  categoryName?: string;
}

export const DEFAULT_RATE_COMPANIES: RateCompanySeed[] = [
  {
    "id": "7ee9b068-209a-42a8-9a4c-4f359f9346f5",
    "name": "CHOLA 20000-40000 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "47d211bb-2a31-4fa6-ab26-760c415a0150",
    "name": "CHOLA 2501-3500 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "a6066fec-8075-493d-8c25-075d27efef76",
    "name": "CHOLA 7500-20000 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "46d49a70-c623-4b84-93b2-f83842663321",
    "name": "FUTURE 3500-7500 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "e5daa99a-4fad-427b-a6e1-7f3cbc9fefc1",
    "name": "GO DIGIT 20000-43000 GVW ABOVE 5 YEAR",
    "status": 1
  },
  {
    "id": "0e49f1bb-2abb-4903-b924-b327b06aee5f",
    "name": "HDFC 0-2500 GVW NORMAL & NIL DEP",
    "status": 1
  },
  {
    "id": "cb9e27f3-e6a3-4847-8baf-f7a60aff1489",
    "name": "HDFC 2501-3500 GVW NORMAL & NIL DEP",
    "status": 1
  },
  {
    "id": "82551198-138c-4145-baac-74b67f8cb556",
    "name": "ICICI 0-3500 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "c503ddd9-0200-4558-bfe7-4dd4a0f66686",
    "name": "ICICI 3500 -7500 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "ff1892c2-3121-45a3-b655-8d6f07ba3c15",
    "name": "ICICI 7500-11990 GVW NIL DEP",
    "status": 1
  },
  {
    "id": "d931b450-a568-41d6-b2e7-ad9afe15ef44",
    "name": "ICICI 7500-11990 GVW NORMAL",
    "status": 1
  },
  {
    "id": "70282161-8fcb-44ef-9523-7dc2c6d3b9b3",
    "name": "LIBERTY 0-2500 GVW NORMAL AND NIL DEP",
    "status": 1
  },
  {
    "id": "fbd17289-c272-4ade-a105-240b9ab377ce",
    "name": "MAGMA 12000-40000 GVW NORMAL ABOVE 5 YEAR",
    "status": 1
  },
  {
    "id": "c7cafd88-f532-4f2a-a60d-d16fdaad6cd3",
    "name": "MAGMA 20000-40000 GVW NIL DEP",
    "status": 1
  },
  {
    "id": "1f1cc3a7-9e75-4f89-a4fd-5a659393018c",
    "name": "MAGMA 20000-40000 GVW NORMAL BELOW 5 YEAR",
    "status": 1
  },
  {
    "id": "44a37c92-cb33-4532-982b-7391d3f792ef",
    "name": "MAGMA 7500-12000 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "c1c8a44b-b451-4cea-bb48-0cb312af25e8",
    "name": "RELIANCE 12000-20000 GVW ABOVE 5 YEAR ONLY",
    "status": 1
  },
  {
    "id": "2c487d01-8005-4acf-95b8-42db0e0d3a7c",
    "name": "RELIANCE 40001-50000 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "f1d9f093-bed3-4710-8595-4fdafbbd4931",
    "name": "RELIANCE ABOVE 50000 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "0adb4e52-11aa-418b-bcf0-8bcb9ecf85d4",
    "name": "ROYAL 12000-20000 GVW NIL DEP",
    "status": 1
  },
  {
    "id": "74caaf1d-f160-4505-a789-81a4a4ecf24c",
    "name": "ROYAL 12000-20000 GVW NORMAL",
    "status": 1
  },
  {
    "id": "08d62616-32f0-438c-b50e-cfbf51f2a7b1",
    "name": "SBI 0-2000 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "eacfb63e-b510-4424-be14-85f3c68eb3a3",
    "name": "SBI 12000-40000 GVW BELOW 5 YEAR NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "675417a1-bf97-4f0d-8832-bea80021ca02",
    "name": "SBI 12000-40000 GVW NORMAL ABOVE 5 YEAR",
    "status": 1
  },
  {
    "id": "fe6c15ba-9b25-407e-8bce-f31b0c476138",
    "name": "SBI 2500-3500 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "862bbf6d-1b49-4541-8be5-1af0616f27f2",
    "name": "SBI ABOVE 40000 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "89d6ac4a-3b3d-4c01-84e6-17113ecfd328",
    "name": "SCHOOL BUS RELIANCE/TATA/GO DIGIT",
    "status": 1
  },
  {
    "id": "1c48237c-d990-44d8-ba7d-bef037d6b4da",
    "name": "SHRIRAM 0-2800 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "1d727c88-02d9-4520-9e6c-56a93009c8be",
    "name": "SHRIRAM 15 YEARS OLD 0-2800 GVW",
    "status": 1
  },
  {
    "id": "3b38b1e0-7e1f-475a-8cd5-8362aebcaf3f",
    "name": "SHRIRAM 15 YEARS OLD 7500-42500 GVW",
    "status": 1
  },
  {
    "id": "382e1e87-7122-45b3-b41f-92c941a3d0f5",
    "name": "SHRIRAM 3500-7500 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "941cb7a0-b849-40eb-96b1-74fcc9be9756",
    "name": "SHRIRAM 7500-42500 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "2e455dca-ce3a-498c-b9f7-9e69f892c473",
    "name": "SHRIRAM ABOVE 50000 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "6bd92e56-610f-404e-b7a4-89854c233503",
    "name": "TATA 0-2500 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "ae278077-58b7-45ab-a7b1-31a60651853f",
    "name": "TATA 3501-12000 GVW NIL DEP & NORMAL",
    "status": 1
  },
  {
    "id": "0835e651-a9bf-4839-8b1c-995b9953f03d",
    "name": "TAXI NIL DEP NORMAL RELIANCE / SHRIRAM/SBI",
    "status": 1
  },
  {
    "id": "9c1af648-12c7-4b41-997e-492ec0ade5ae",
    "name": "UNIVERSAL SOMPO 20001-45000 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "c0abbbc4-8ca2-4397-947f-76addfb703c0",
    "name": "UNIVERSAL SOMPO 3500-20000 GVW NIL DEP AND NORMAL",
    "status": 1
  },
  {
    "id": "0f3b8b1e-1ffa-477a-9ea7-7f7b9f6a642c",
    "name": "UNIVERSAL SOMPO ABOVE 45000 GVW NIL DEP AND NORMAL",
    "status": 1
  }
];

export const DEFAULT_RATE_RELATIONSHIPS: RateRelationshipSeed[] = [
  {
    "id": "39a54da4-9359-48d5-bdac-751856b28ca9",
    "companyId": "aac3e331-c256-4ec9-afba-fd54f3f94acd",
    "categoryId": "5314f6a8-adf6-455f-a006-c4e1067908f2",
    "percentage": 22,
    "profit": 5500,
    "remarks": "Nil dep koi to 1000 plus karna 5,500 hey to 2000 plus karna",
    "status": 2,
    "companyName": "ROYAL SUNDARAM 7500-12000 GVW NIL DEP AND NORMAL",
    "categoryName": "ROYAL SUNDARAM 7500-12000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "db92a74d-7704-4220-9a3c-41d33dbf9d90",
    "companyId": "7099db5a-61ac-4bee-91f7-c89d56716636",
    "categoryId": "7df5dfd5-d862-441f-aa11-5acc9a1d6954",
    "percentage": 30,
    "profit": 4500,
    "remarks": "TATA & AL DISCOUNT 90% OTHRH MAKE DISCOUNT 85%. GJD hey to RATE ma 3000 plus karvo. TATA & AL sivay na model no RATE ma 1500 plus karva",
    "status": 2,
    "companyName": "ROYAL SUNDARAM 20000-40000 GVW NIL DEP",
    "categoryName": "ROYAL SUNDARAM 20000-40000 GVW NIL DEP"
  },
  {
    "id": "0902d958-085c-4a0c-9639-8fcfe3f0afda",
    "companyId": "7f5afa26-a5db-4297-973b-ffb72510e795",
    "categoryId": "2c559779-6094-4887-a845-2ad03c19a975",
    "percentage": 32,
    "profit": 4000,
    "remarks": "TATA & AL DISCOUNT 90% OTHRH MAKE DISCOUNT 85%. GJD hey to RATE ma 2000 plus karvo. TATA & AL sivay na model no RATE ma 1000 plus karva",
    "status": 2,
    "companyName": "ROYAL SUNDARAM 20000-40000 GVW NORMAL",
    "categoryName": "ROYAL SUNDARAM 20000-40000 GVW NORMAL"
  },
  {
    "id": "845014f0-28d4-4b1b-b6dc-dc4c7898e9d3",
    "companyId": "7b7ec458-331d-4fbc-b391-95b66e778d00",
    "categoryId": "21f16516-8ceb-4850-b963-b4243f0f820a",
    "percentage": 26,
    "profit": 4000,
    "remarks": "TATA & AL DISCOUNT 90% OTHRH MAKE DISCOUNT 85%. GJD hey to RATE ma 1500 plus karvo. TATA & AL sivay na model no RATE ma 1000 plus karva",
    "status": 2,
    "companyName": "ROYAL SUNDARAM 12000-20000 GVW NIL DEP",
    "categoryName": "ROYAL SUNDARAM 12000-20000 GVW NIL DEP"
  },
  {
    "id": "aed62326-c61e-4f3f-8d06-6944e2f56f40",
    "companyId": "1ccab814-503c-435d-9468-d15e113a345f",
    "categoryId": "11dfe280-3e10-4854-8bbf-88b900045d91",
    "percentage": 30,
    "profit": 3500,
    "remarks": "TATA & AL DISCOUNT 90% OTHRH MAKE DISCOUNT 85%. GJD hey to RATE ma 1000 plus karvo. TATA & AL sivay na model no RATE ma 1000 plus karva",
    "status": 2,
    "companyName": "ROYAL SUNDARAM 12000-20000 GVW NORMAL",
    "categoryName": "ROYAL SUNDARAM 12000-20000 GVW NORMAL"
  },
  {
    "id": "0975e9cd-8cfc-4fec-970c-331fce378cf3",
    "companyId": "2979bdab-108f-44d3-8950-fbeff715122f",
    "categoryId": "1be12077-aa93-4989-b396-f70e88fc70ba",
    "percentage": 33,
    "profit": 4500,
    "remarks": "QUOTE FROM SYSTEM, ALL MODEL ALL RTO. ICICI ma no hoy aavata karvi",
    "status": 2,
    "companyName": "ORIENTAL 3500-7500 NIL DEP AND NORMAL",
    "categoryName": "ORIENTAL 3500-7500 NIL DEP AND NORMAL"
  },
  {
    "id": "79e0d62a-61db-4a59-9823-5593571ad365",
    "companyId": "3b38b1e0-7e1f-475a-8cd5-8362aebcaf3f",
    "categoryId": "fca0fc93-b95d-4c3f-a6ea-249719bfd6d3",
    "percentage": 20,
    "profit": 5000,
    "remarks": "",
    "status": 1,
    "companyName": "SHRIRAM 15 YEARS OLD 7500-42500 GVW",
    "categoryName": "SHRIRAM 15 YEARS OLD 7500-42500 GVW"
  },
  {
    "id": "85a3219b-bb39-4c2d-b100-7111ffbfde4c",
    "companyId": "2b5ef18e-a58d-4bbf-9aa6-d5f630cafba2",
    "categoryId": "e2aa8264-2d29-4fb1-8640-b48f35ba6739",
    "percentage": 46,
    "profit": 5000,
    "remarks": "DISCOUNT 90% IN FULL POLICY",
    "status": 2,
    "companyName": "STAFF BUS (ANY COMPANY) TP & FULL",
    "categoryName": "STAFF BUS (ANY COMPANY) TP & FULL"
  },
  {
    "id": "7f1fe889-1df3-44e7-9215-ee32fe8b1ae0",
    "companyId": "4fd0f2bc-6663-4cbb-b72e-ff4ae51e2c64",
    "categoryId": "f14ed41f-2958-48db-b9fd-04c485593243",
    "percentage": 50,
    "profit": 4500,
    "remarks": "Applicable For: Ace, Super Ace, Radha Xenon, Magic, Intra, Super Carry, Mahindra Jeeto, Tractor, Supro",
    "status": 2,
    "companyName": "CHOLA 0-2500 GVW NIL DEP AND NORMAL RATE FOR SPECIAL MODEL",
    "categoryName": "CHOLA 0-2500 GVW NIL DEP AND NORMAL RATE FOR SPECIAL MODEL"
  },
  {
    "id": "c637db57-be16-4007-97ea-4364ce687522",
    "companyId": "4bd1390d-4f66-44f3-a646-301961252b3d",
    "categoryId": "f9f842df-f251-400b-ad73-3ac4b234575d",
    "percentage": 10,
    "profit": 5500,
    "remarks": "ALL MODELS ALL RTO, DISCOUNT 90%, tanker hey to 1500 plus karva",
    "status": 2,
    "companyName": "SHRIRAM 42501-55000 GVW NIL DEP AND NORMAL",
    "categoryName": "SHRIRAM 42501-55000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "2ed85920-12b7-4938-9ef4-f92cf2c445d5",
    "companyId": "490db688-4b17-4306-b25d-fd8824ec5c2c",
    "categoryId": "38c8b1c9-4d7f-4725-972e-c0fb4975bf3d",
    "percentage": 35,
    "profit": 5500,
    "remarks": "ALL MODELS ALL RTO, DISCOUNT 90%",
    "status": 2,
    "companyName": "SHRIRAM 7500-12000 GVW NIL DEP AND NORMAL",
    "categoryName": "SHRIRAM 7500-12000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "2e714784-47a8-458c-b19f-916b67579d36",
    "companyId": "9a9522fb-f3f9-4554-aeb5-2e0b9826ad22",
    "categoryId": "c02c42ca-57f8-43ba-91d0-7acd671cddab",
    "percentage": 55,
    "profit": 4500,
    "remarks": "ALL MODELS ALL RTO, DISCOUNT 85%, Inspection Required if Previous Policy Expired",
    "status": 2,
    "companyName": "SHRIRAM 2801-3500 GVW NIL DEP AND NORMAL",
    "categoryName": "SHRIRAM 2801-3500 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "3ee8d623-470c-43d0-af6c-0764bf92923d",
    "companyId": "3c04f31f-0687-43ae-988e-da182b9876d8",
    "categoryId": "f32101d4-a5c7-4d8b-82df-60313d784773",
    "percentage": 59,
    "profit": 4500,
    "remarks": "ALL MAKE MODEL ALL RTOs",
    "status": 2,
    "companyName": "INDUSIND/RELIANCE 0-2500 GVW NIL DEP AND NORMAL",
    "categoryName": "INDUSIND/RELIANCE 0-2500 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "77b37e73-97ba-4daa-8af1-cd3c3db6ba5e",
    "companyId": "c8a248f5-83bf-442d-a604-e92df50b53f7",
    "categoryId": "cfa3217d-d9fe-4e67-bf4b-2fcdfd5a951d",
    "percentage": 21,
    "profit": 5500,
    "remarks": "ALL RTO, TATA AND AL ONLY, DISCOUNT 85% Nil dep quote from system",
    "status": 2,
    "companyName": "SBI 12000-40000 GVW BELOW 1 YEAR NIL DEP AND NORMAL",
    "categoryName": "SBI 12000-40000 GVW BELOW 1 YEAR NIL DEP AND NORMAL"
  },
  {
    "id": "2c26bb56-357a-4305-aab2-b7d60fa8a51c",
    "companyId": "35cd8345-6b03-4276-ae44-fb7c23146823",
    "categoryId": "f45a45cb-c2f0-4049-86a5-6728d5e19ff1",
    "percentage": 50,
    "profit": 4500,
    "remarks": "DISCOUNT 90%, DECLINE RTO AUTHORITY (AHMEDABAD, BARODA, SURAT, RAJKOT, GANDHINAGAR)",
    "status": 2,
    "companyName": "ICICI 2500-3500 GVW NIL DEP AND NORMAL",
    "categoryName": "ICICI 2500-3500 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "5fb68eff-3596-4486-9528-ddde9717c6ee",
    "companyId": "7ab248a8-672b-46e1-a677-ad4598f9506c",
    "categoryId": "41fdcdc6-f607-4571-ad32-4d0f310f52fc",
    "percentage": 10,
    "profit": 5500,
    "remarks": "DISCOUNT 75% TATA, AL AND ICICI 03",
    "status": 2,
    "companyName": "SHRIRAM ABOVE 55000 GVW NIL DEP AND NORMAL",
    "categoryName": "SHRIRAM ABOVE 55000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "43435929-ef38-4648-a488-fbe35b126140",
    "companyId": "396a5f32-73cb-4288-a741-d7264e09ec4d",
    "categoryId": "916497ee-c5ea-49c5-8ba3-7070420c64d0",
    "percentage": 72,
    "profit": 2500,
    "remarks": "DISCOUNT 90%, NIL DEP NOT APPLICABLE ALWAYS NORMAL POLICY",
    "status": 2,
    "companyName": "SCHOOL BUS (ANY COMPANY) TP & FULL",
    "categoryName": "SCHOOL BUS (ANY COMPANY) TP & FULL"
  },
  {
    "id": "019b081e-a3a3-425d-ab45-90f543611c11",
    "companyId": "00afaed0-6d21-465c-bbaa-093f95c80ce3",
    "categoryId": "0a7182c0-520d-42e2-941c-5d7204920550",
    "percentage": 19,
    "profit": 5500,
    "remarks": "DISCOUNT 85-90% DECLINED RTO (AHMEDABAD, BARODA, SURAT, RAJKOT, GANDHINAGAR) PETROL, DIESEL, GAS TANKER ALLOWED",
    "status": 2,
    "companyName": "ICICI 12000-55000 GVW NIL DEP AND NORMAL",
    "categoryName": "ICICI 12000-55000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "e52e4d31-376e-459a-8013-3795ef8c1cb9",
    "companyId": "b7d9854e-a04c-4c65-a08d-5761c7fe3324",
    "categoryId": "33113c15-1788-442c-bd03-84ccb59e57b9",
    "percentage": 24,
    "profit": 5000,
    "remarks": "DISCOUNT 85% ALL MAKE MODEL SPECIAL FOR BHARATBENZ",
    "status": 2,
    "companyName": "GODIGIT 20000-43000 GVW ABOVE 1 YEAR",
    "categoryName": "GODIGIT 20000-43000 GVW ABOVE 1 YEAR"
  },
  {
    "id": "122f6c48-84bc-42b6-a4bd-1844b3ffe433",
    "companyId": "d1b827ca-0a86-4f97-8353-e1cf09db9067",
    "categoryId": "d8a3a325-8f98-4306-9820-057360d7ccc0",
    "percentage": 42,
    "profit": 5000,
    "remarks": "DISCOUNT 88% ALL MAKE MODEL, DECLINE RTO: AHMEDABAD, BARODA, SURAT, RAJKOT, GANDHINAGAR",
    "status": 2,
    "companyName": "ICICI 3500-7500 GVW NILDEP AND NORMAL",
    "categoryName": "ICICI 3500-7500 GVW NILDEP AND NORMAL"
  },
  {
    "id": "38065265-1ed4-4f64-98bf-13f1d5bcd513",
    "companyId": "b087b896-5bea-4d5f-8c27-c58fc5937c12",
    "categoryId": "97aefbc5-5189-4ff8-bd74-0f16eaea6144",
    "percentage": 27,
    "profit": 5500,
    "remarks": "ALL MODELS ALL RTO, DISCOUNT 90%, tanker hey to 1500 plus karva",
    "status": 2,
    "companyName": "SHRIRAM 12001-42500 GVW NIL DEP & NORMAL",
    "categoryName": "SHRIRAM 12001-42500 GVW NIL DEP & NORMAL"
  },
  {
    "id": "096400fb-5696-49c9-98ba-fe56146ee4a2",
    "companyId": "88272b53-8ce9-46d2-aaca-d4568ae0d9d6",
    "categoryId": "d7fd594d-46ba-475d-8798-eba4da1b622e",
    "percentage": 64,
    "profit": 4500,
    "remarks": "UPTO 2500 GVW IF TATA MODEL, ALL MODELS ALL RTO, DISCOUNT 90%",
    "status": 2,
    "companyName": "SB 0-2500 GVW NIL DEP AND NORMAL",
    "categoryName": "SB 0-2500 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "e3350c92-cfdc-43d2-a185-f7578c2ad12a",
    "companyId": "47d211bb-2a31-4fa6-ab26-760c415a0150",
    "categoryId": "3e7b478d-c4c7-457f-b7c6-0918f2fec595",
    "percentage": 60,
    "profit": 4500,
    "remarks": "ALL MODELS ALL RTOs. DISCOUNT 80%. PA COVER Rs. 550/- Compulsory.",
    "status": 1,
    "companyName": "CHOLA 2501-3500 GVW NIL DEP AND NORMAL",
    "categoryName": "CHOLA 2501-3500 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "f8d210a4-ecda-4485-93bd-ec0bb10ab90b",
    "companyId": "1c48237c-d990-44d8-ba7d-bef037d6b4da",
    "categoryId": "da4c9c8a-ad4f-4deb-88ba-a531077a240e",
    "percentage": 58,
    "profit": 4500,
    "remarks": "ALL MODELS ALL RTOs. DISCOUNT 80%. Inspection Required if Previous Policy Expired.",
    "status": 1,
    "companyName": "SHRIRAM 0-2800 GVW NIL DEP AND NORMAL",
    "categoryName": "SHRIRAM 0-2800 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "06cddcae-232c-48fd-99cd-1d43affc927a",
    "companyId": "08d62616-32f0-438c-b50e-cfbf51f2a7b1",
    "categoryId": "b2c8a009-254c-4aed-b8f8-3f9a22758afb",
    "percentage": 64,
    "profit": 5000,
    "remarks": "UPTO 2500 GVW IF TATA MODEL,  ALL MODELS ALL RTOs. DISCOUNT 80%.",
    "status": 1,
    "companyName": "SBI 0-2000 GVW NIL DEP AND NORMAL",
    "categoryName": "SBI 0-2000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "e29e5963-2bf8-46f0-b8b0-ca2a3ee8f31a",
    "companyId": "ae278077-58b7-45ab-a7b1-31a60651853f",
    "categoryId": "e03286e0-b632-4a7c-b159-4cfff436158c",
    "percentage": 30,
    "profit": 5000,
    "remarks": "DISCOUNT 85%.  DECLINED RTO (GJ07, 12,13,17,20,23,34,36,39)",
    "status": 1,
    "companyName": "TATA 3501-12000 GVW NIL DEP & NORMAL",
    "categoryName": "TATA 3501-12000 GVW NIL DEP & NORMAL"
  },
  {
    "id": "a6ef48f7-5aa3-4468-b583-fed69bd7806b",
    "companyId": "675417a1-bf97-4f0d-8832-bea80021ca02",
    "categoryId": "4105982f-b29d-4289-a93c-b3cf1c39f1da",
    "percentage": 33,
    "profit": 6000,
    "remarks": "TATA AND AL ONLY. GJ03, GJ17 DECLINE. DISCOUNT 90%.",
    "status": 1,
    "companyName": "SBI 12000-40000 GVW NORMAL ABOVE 5 YEAR",
    "categoryName": "SBI 12000-40000 GVW NORMAL ABOVE 5 YEAR"
  },
  {
    "id": "f0280ceb-2099-49bf-986f-405a7ca4027c",
    "companyId": "fbd17289-c272-4ade-a105-240b9ab377ce",
    "categoryId": "bccf783f-b98f-4557-93b0-5467f615aa2f",
    "percentage": 28,
    "profit": 5500,
    "remarks": "ALL RTOs. TATA , AL, EICHER ONLY. DISCOUNT 90%.",
    "status": 1,
    "companyName": "MAGMA 12000-40000 GVW NORMAL ABOVE 5 YEAR",
    "categoryName": "MAGMA 12000-40000 GVW NORMAL ABOVE 5 YEAR"
  },
  {
    "id": "7212438f-87f3-4f6b-9bc3-a0c2d4f20c37",
    "companyId": "c7cafd88-f532-4f2a-a60d-d16fdaad6cd3",
    "categoryId": "7a1318e2-310d-4ac4-ac07-13ead7ea3423",
    "percentage": 24,
    "profit": 5500,
    "remarks": "ALL RTOs. TATA , AL, EICHER ONLY. DISCOUNT AS PER SYSTEM",
    "status": 1,
    "companyName": "MAGMA 20000-40000 GVW NIL DEP",
    "categoryName": "MAGMA 20000-40000 GVW NIL DEP"
  },
  {
    "id": "75c08767-fedb-49a5-a90c-8a5933309b5e",
    "companyId": "941cb7a0-b849-40eb-96b1-74fcc9be9756",
    "categoryId": "526f95a9-a1c6-43b0-a31e-a9ed02805bc6",
    "percentage": 27,
    "profit": 5500,
    "remarks": "ALL MODELS. GJ03 DECLINE. DISCOUNT 90%",
    "status": 1,
    "companyName": "SHRIRAM 7500-42500 GVW NIL DEP AND NORMAL",
    "categoryName": "SHRIRAM 7500-42500 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "3c04c272-e1d4-4f43-ae18-7b3ee443ddc8",
    "companyId": "7ee9b068-209a-42a8-9a4c-4f359f9346f5",
    "categoryId": "4e20776d-f2f2-44b0-ac25-9531e2514e65",
    "percentage": 33,
    "profit": 5500,
    "remarks": "ALL MAKE ALL RTO, DISCOUNT 87.5%   FOR BHARATBENZ DISCOUNT 85%",
    "status": 1,
    "companyName": "CHOLA 20000-40000 GVW NIL DEP AND NORMAL",
    "categoryName": "CHOLA 20000-40000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "c45fff7b-a5b8-4e30-931b-c11b01132861",
    "companyId": "c503ddd9-0200-4558-bfe7-4dd4a0f66686",
    "categoryId": "e96071ea-da63-4156-b350-b462b23168a4",
    "percentage": 35,
    "profit": 4500,
    "remarks": "DISCOUNT 80% ALL MAKE MODEL DECLINE RTO (GJ01,18, 27,38) REG AUTHORITY WILL BE CONSIDERED",
    "status": 1,
    "companyName": "ICICI 3500 -7500 GVW NIL DEP AND NORMAL",
    "categoryName": "ICICI 3500 -7500 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "e5c08f2b-31d4-4f40-8af2-2de4c26541ca",
    "companyId": "e5daa99a-4fad-427b-a6e1-7f3cbc9fefc1",
    "categoryId": "e1a1a25a-42b9-404d-9377-70cb39bbaf5e",
    "percentage": 24,
    "profit": 5500,
    "remarks": "DISCOUNT 85% ALL MAKE MODEL SPECIAL FOR BHARATBENZ",
    "status": 1,
    "companyName": "GO DIGIT 20000-43000 GVW ABOVE 5 YEAR",
    "categoryName": "GO DIGIT 20000-43000 GVW ABOVE 5 YEAR"
  },
  {
    "id": "586800f9-4289-4db3-9fbb-2875748729d9",
    "companyId": "0835e651-a9bf-4839-8b1c-995b9953f03d",
    "categoryId": "e7403d04-c9b8-4121-b728-8b751c3ef1da",
    "percentage": 30,
    "profit": 4500,
    "remarks": "Discount 70%",
    "status": 1,
    "companyName": "TAXI NIL DEP NORMAL RELIANCE / SHRIRAM/SBI",
    "categoryName": "TAXI NIL DEP NORMAL RELIANCE / SHRIRAM/SBI"
  },
  {
    "id": "4a2b4b38-90ff-411b-8ded-758f6744373a",
    "companyId": "d931b450-a568-41d6-b2e7-ad9afe15ef44",
    "categoryId": "e00017ce-ad15-41b9-bcef-1de2231938f2",
    "percentage": 30,
    "profit": 5000,
    "remarks": "DISCOUNT 80%, DECLINED RTO(GJ01,03,05,06,18, 27,38) REG AUTHORITY WILL BE CONSIDERED",
    "status": 1,
    "companyName": "ICICI 7500-11990 GVW NORMAL",
    "categoryName": "ICICI 7500-11990 GVW NORMAL"
  },
  {
    "id": "c1a0a787-6be8-4f9a-812b-ddedb0205ff3",
    "companyId": "ff1892c2-3121-45a3-b655-8d6f07ba3c15",
    "categoryId": "50d75332-9096-4556-bbd9-6e1691d01cf1",
    "percentage": 30,
    "profit": 5500,
    "remarks": "DISCOUNT 80%,  DECLINED RTO(GJ01,03,05,06,18, 27,38) REG AUTHORITY WILL BE CONSIDERED",
    "status": 1,
    "companyName": "ICICI 7500-11990 GVW NIL DEP",
    "categoryName": "ICICI 7500-11990 GVW NIL DEP"
  },
  {
    "id": "6d07a224-2c17-4b18-9be2-fa2a111e3dd0",
    "companyId": "fe6c15ba-9b25-407e-8bce-f31b0c476138",
    "categoryId": "97d1c549-5fb9-424c-b11c-10368dd7d692",
    "percentage": 54,
    "profit": 4500,
    "remarks": "DECLINED RTO FOR BOLERO MODEL ONLY (GJ02, 03, 08,09,12, 17, 24, 31)",
    "status": 1,
    "companyName": "SBI 2500-3500 GVW NIL DEP AND NORMAL",
    "categoryName": "SBI 2500-3500 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "442de4cc-3490-4435-82c1-9e3516d7989e",
    "companyId": "89d6ac4a-3b3d-4c01-84e6-17113ecfd328",
    "categoryId": "0400c433-2393-4678-8d54-3707d395c84e",
    "percentage": 72,
    "profit": 2500,
    "remarks": "DISCOUNT 95% NIL DEP NOT APPLICABLE ALWAYS NORMAL POLICY",
    "status": 1,
    "companyName": "SCHOOL BUS RELIANCE/TATA/GO DIGIT",
    "categoryName": "SCHOOL BUS RELIANCE/TATA/GO DIGIT"
  },
  {
    "id": "66675069-1641-4542-b069-1e012c144a0a",
    "companyId": "1f1cc3a7-9e75-4f89-a4fd-5a659393018c",
    "categoryId": "67c1dc3f-a6db-4706-a9d1-7578e81843f2",
    "percentage": 24,
    "profit": 5500,
    "remarks": "ALL RTOs. TATA , AL, EICHER ONLY. DISCOUNT AS PER SYSTEM",
    "status": 1,
    "companyName": "MAGMA 20000-40000 GVW NORMAL BELOW 5 YEAR",
    "categoryName": "MAGMA 20000-40000 GVW NORMAL BELOW 5 YEAR"
  },
  {
    "id": "1ff62261-9009-4351-9b1e-62c8240f4645",
    "companyId": "70282161-8fcb-44ef-9523-7dc2c6d3b9b3",
    "categoryId": "7890d026-95d4-4899-aa85-68975a3b8ab7",
    "percentage": 62,
    "profit": 5000,
    "remarks": "ALL MAKE DISCOUNT 90% GJ02 DECLINED",
    "status": 1,
    "companyName": "LIBERTY 0-2500 GVW NORMAL AND NIL DEP",
    "categoryName": "LIBERTY 0-2500 GVW NORMAL AND NIL DEP"
  },
  {
    "id": "90611083-4efc-4827-96c3-ed76a925d7b0",
    "companyId": "c0abbbc4-8ca2-4397-947f-76addfb703c0",
    "categoryId": "941a6bfb-e4c0-4873-9be7-1489198de848",
    "percentage": 30,
    "profit": 6000,
    "remarks": "ALL MAKE  MODEL ALL RTO DISCOUNT 90% BHARATBENZ DECLINED",
    "status": 1,
    "companyName": "UNIVERSAL SOMPO 3500-20000 GVW NIL DEP AND NORMAL",
    "categoryName": "UNIVERSAL SOMPO 3500-20000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "8e1324f8-a765-48e6-b708-65634d920e07",
    "companyId": "2e455dca-ce3a-498c-b9f7-9e69f892c473",
    "categoryId": "be69856c-a471-4c7a-8d92-fde240488f9f",
    "percentage": 15,
    "profit": 5500,
    "remarks": "DISCOUNT 70% TATA AL AND EICHER",
    "status": 1,
    "companyName": "SHRIRAM ABOVE 50000 GVW NIL DEP AND NORMAL",
    "categoryName": "SHRIRAM ABOVE 50000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "f6b30600-3121-436e-a9fb-6a55dc29acc0",
    "companyId": "82551198-138c-4145-baac-74b67f8cb556",
    "categoryId": "05c22336-0a85-49d9-aadd-36a8ea2c4d86",
    "percentage": 55,
    "profit": 4500,
    "remarks": "DISCOUNT 80%,  ALLOWED RTO (GJ01, 02, 08, 09, 10, 14, 15, 16, 21, 25, 32, 33, 36, 37)",
    "status": 1,
    "companyName": "ICICI 0-3500 GVW NIL DEP AND NORMAL",
    "categoryName": "ICICI 0-3500 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "24744da5-0f1a-40ce-aef7-e02495afce40",
    "companyId": "2c487d01-8005-4acf-95b8-42db0e0d3a7c",
    "categoryId": "7957836e-56e4-484a-9c32-5a0b8409ae1e",
    "percentage": 29,
    "profit": 6000,
    "remarks": "TOWING 1000 Rs Compulsory, Discount 90  TATA, AL & EICHER ONLY ALL RTO",
    "status": 1,
    "companyName": "RELIANCE 40001-50000 GVW NIL DEP AND NORMAL",
    "categoryName": "RELIANCE 40001-50000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "97e7373b-908c-44c6-91b2-6094d8499fb7",
    "companyId": "1d727c88-02d9-4520-9e6c-56a93009c8be",
    "categoryId": "9ee110a3-7f48-4edd-99cf-51efbd8738fe",
    "percentage": 50,
    "profit": 4500,
    "remarks": "",
    "status": 1,
    "companyName": "SHRIRAM 15 YEARS OLD 0-2800 GVW",
    "categoryName": "SHRIRAM 15 YEARS OLD 0-2800 GVW"
  },
  {
    "id": "43af1ebc-58d8-4ce7-8e3e-7154e1e42d0f",
    "companyId": "46d49a70-c623-4b84-93b2-f83842663321",
    "categoryId": "89505cd3-d475-40d1-b825-7d7b9960b8e8",
    "percentage": 35,
    "profit": 5000,
    "remarks": "DECLINED RTO: GJ10, 17, 20, 25, 35",
    "status": 1,
    "companyName": "FUTURE 3500-7500 GVW NIL DEP AND NORMAL",
    "categoryName": "FUTURE 3500-7500 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "bc3849af-b684-4993-9924-0d230ec0590c",
    "companyId": "44a37c92-cb33-4532-982b-7391d3f792ef",
    "categoryId": "48ff1257-851f-4ff6-98f0-f6afd7b0bc9d",
    "percentage": 24,
    "profit": 5000,
    "remarks": "TATA, AL & EICHER, DISCOUNT AS PER SYSTEM",
    "status": 1,
    "companyName": "MAGMA 7500-12000 GVW NIL DEP AND NORMAL",
    "categoryName": "MAGMA 7500-12000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "d90e8d6a-87b8-4560-8642-8d5da550564f",
    "companyId": "382e1e87-7122-45b3-b41f-92c941a3d0f5",
    "categoryId": "7f2ca848-4069-4939-ad23-0a28aea8e649",
    "percentage": 37,
    "profit": 5000,
    "remarks": "ONLY WITH NCB CASES DISCOUNT 80%",
    "status": 1,
    "companyName": "SHRIRAM 3500-7500 GVW NIL DEP AND NORMAL",
    "categoryName": "SHRIRAM 3500-7500 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "6015f3e3-6f76-4e6a-97ce-b421d8cac98d",
    "companyId": "862bbf6d-1b49-4541-8be5-1af0616f27f2",
    "categoryId": "ea150ebc-a2a9-4eb1-9eec-de3831f440cd",
    "percentage": 16,
    "profit": 5500,
    "remarks": "DISCOUNT 85%",
    "status": 1,
    "companyName": "SBI ABOVE 40000 GVW NIL DEP AND NORMAL",
    "categoryName": "SBI ABOVE 40000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "6d9361f4-11b4-4c6d-a176-47d246405fb4",
    "companyId": "a6066fec-8075-493d-8c25-075d27efef76",
    "categoryId": "4ee6ff26-81ed-45c9-b2f6-5e0584ac75da",
    "percentage": 20,
    "profit": 5000,
    "remarks": "CONFIRM DISCOUNT FROM SYSTEM",
    "status": 1,
    "companyName": "CHOLA 7500-20000 GVW NIL DEP AND NORMAL",
    "categoryName": "CHOLA 7500-20000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "e8958d1a-91ea-4872-b8d4-6494d93afc0e",
    "companyId": "9c1af648-12c7-4b41-997e-492ec0ade5ae",
    "categoryId": "9e20bb91-1a7c-495f-8478-783414efd473",
    "percentage": 32,
    "profit": 6000,
    "remarks": "ALL MAKE  MODEL ALL RTO DISCOUNT 90% BHARATBENZ DECLINED",
    "status": 1,
    "companyName": "UNIVERSAL SOMPO 20001-45000 GVW NIL DEP AND NORMAL",
    "categoryName": "UNIVERSAL SOMPO 20001-45000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "daddb767-6b44-4f55-9b95-45f82e68183a",
    "companyId": "0f3b8b1e-1ffa-477a-9ea7-7f7b9f6a642c",
    "categoryId": "7f892fae-7cde-4511-a59a-6948b0b7527c",
    "percentage": 28,
    "profit": 6000,
    "remarks": "ALL MAKE  MODEL ALL RTO DISCOUNT 90% BHARATBENZ DECLINED",
    "status": 1,
    "companyName": "UNIVERSAL SOMPO ABOVE 45000 GVW NIL DEP AND NORMAL",
    "categoryName": "UNIVERSAL SOMPO ABOVE 45000 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "25cd4b8d-fa0a-472f-8575-c07388c3e29e",
    "companyId": "eacfb63e-b510-4424-be14-85f3c68eb3a3",
    "categoryId": "7175393e-e4b7-4b9e-91d2-7526509911ea",
    "percentage": 26,
    "profit": 5000,
    "remarks": "TATA AND AL ONLY. GJ03, GJ17 DECLINE. DISCOUNT 90%  Nil dep quote from system",
    "status": 1,
    "companyName": "SBI 12000-40000 GVW BELOW 5 YEAR NIL DEP AND NORMAL",
    "categoryName": "SBI 12000-40000 GVW BELOW 5 YEAR NIL DEP AND NORMAL"
  },
  {
    "id": "f827f96d-9a4c-4348-9166-854b3da89a14",
    "companyId": "0adb4e52-11aa-418b-bcf0-8bcb9ecf85d4",
    "categoryId": "3c1a9227-8163-483b-a6fb-01aac4079b7a",
    "percentage": 22,
    "profit": 5000,
    "remarks": "TATA & AL MAKE DISCOUNT 90% Nil dep quote from system",
    "status": 1,
    "companyName": "ROYAL 12000-20000 GVW NIL DEP",
    "categoryName": "ROYAL 12000-20000 GVW NIL DEP"
  },
  {
    "id": "1548653a-ce27-4327-a4f7-b5fe98d4274a",
    "companyId": "0e49f1bb-2abb-4903-b924-b327b06aee5f",
    "categoryId": "b40dc2c5-2346-410f-8adf-bff3daab2987",
    "percentage": 63,
    "profit": 5000,
    "remarks": "DISCOUNT 90% ALL MAKE MODEL ALL RTO",
    "status": 1,
    "companyName": "HDFC 0-2500 GVW NORMAL & NIL DEP",
    "categoryName": "HDFC 0-2500 GVW NORMAL & NIL DEP"
  },
  {
    "id": "be763f96-a062-4b62-ae2d-e889984a8be4",
    "companyId": "cb9e27f3-e6a3-4847-8baf-f7a60aff1489",
    "categoryId": "604e3594-0a35-47df-ad9c-3ed561da36c3",
    "percentage": 50,
    "profit": 4500,
    "remarks": "DISCOUNT 90% ALL MAKE MODEL ALL RTO",
    "status": 1,
    "companyName": "HDFC 2501-3500 GVW NORMAL & NIL DEP",
    "categoryName": "HDFC 2501-3500 GVW NORMAL & NIL DEP"
  },
  {
    "id": "8ccdd71a-ff14-45e1-a234-d9718ef5ac9c",
    "companyId": "74caaf1d-f160-4505-a789-81a4a4ecf24c",
    "categoryId": "d3c9b67b-c731-40ea-8578-37b057d3fb3b",
    "percentage": 30,
    "profit": 5000,
    "remarks": "DISCOUNT 90% TATA & AL ONLY",
    "status": 1,
    "companyName": "ROYAL 12000-20000 GVW NORMAL",
    "categoryName": "ROYAL 12000-20000 GVW NORMAL"
  },
  {
    "id": "6a307e0d-4213-45d6-a39d-84b84d72be3b",
    "companyId": "6bd92e56-610f-404e-b7a4-89854c233503",
    "categoryId": "0a4ddc6d-4507-4f65-99e3-0639503e67fc",
    "percentage": 59,
    "profit": 4500,
    "remarks": "DISCOUNT 80%. DECLINE RTO (GJ07 ,12, 13, 17, 20, 23, 34, 39) GJ03 hoy to 1500 plus karva",
    "status": 1,
    "companyName": "TATA 0-2500 GVW NIL DEP AND NORMAL",
    "categoryName": "TATA 0-2500 GVW NIL DEP AND NORMAL"
  },
  {
    "id": "f425569d-51f5-4e04-ad11-5029329de5d4",
    "companyId": "c1c8a44b-b451-4cea-bb48-0cb312af25e8",
    "categoryId": "ee3a1c3e-fdbf-46a1-967e-e22e8b9d864c",
    "percentage": 20,
    "profit": 5000,
    "remarks": "DISCOUNT 90% ALL RTO TATA AL & EICHER",
    "status": 1,
    "companyName": "RELIANCE 12000-20000 GVW ABOVE 5 YEAR ONLY",
    "categoryName": "RELIANCE 12000-20000 GVW ABOVE 5 YEAR ONLY"
  },
  {
    "id": "c12c3cc2-3199-4170-8e14-e4a5c7538882",
    "companyId": "f1d9f093-bed3-4710-8595-4fdafbbd4931",
    "categoryId": "a2ee53e1-5efa-4737-99ab-61817940d9c5",
    "percentage": 15,
    "profit": 5500,
    "remarks": "ADDITONAL TOWING COMPULSORY DISCOUNT 85%",
    "status": 1,
    "companyName": "RELIANCE ABOVE 50000 GVW NIL DEP AND NORMAL",
    "categoryName": "RELIANCE ABOVE 50000 GVW NIL DEP AND NORMAL"
  }
];
