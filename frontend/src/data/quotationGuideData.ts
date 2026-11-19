/**
 * TORQUE AUTO ADVISOR - QUOTATION GUIDE DATA ENGINE
 * Generated from /Users/utkarshmakwana/Downloads/QUOTATION GUIDE.xlsx
 * Contains comprehensive underwriting guidelines, GVW brackets, TP rates, Nil Dep matrices,
 * PCV & LMV guides, RTO mappings, and the smart insurer recommendation engine.
 */

export interface GVWBracket {
  id: string;
  minKg: number;
  maxKg: number;
  label: string;
  popularVehicles: string;
}

export const GVW_BRACKETS: GVWBracket[] = [
  { id: '0-2500', minKg: 0, maxKg: 2500, label: '0 – 2,500 kg', popularVehicles: 'Tata Ace, Super Carry, Jeeto, Supro, Dost Mini' },
  { id: '2501-3500', minKg: 2501, maxKg: 3500, label: '2,501 – 3,500 kg', popularVehicles: 'Bolero Maxi Truck, Intra, Yodha, Xenon, Dost' },
  { id: '3501-7500', minKg: 3501, maxKg: 7500, label: '3,501 – 7,500 kg', popularVehicles: 'Tata 407, Eicher Pro 1049/1055, 709' },
  { id: '7501-12000', minKg: 7501, maxKg: 12000, label: '7,501 – 12,000 kg', popularVehicles: 'Tata 1109, Eicher Pro 2095/2110, Ashok Leyland Partner' },
  { id: '12000-20000', minKg: 12001, maxKg: 20000, label: '12,000 – 20,000 kg', popularVehicles: 'Tata 1613/1618, 6-Wheeler Trucks, Eicher Pro 3015' },
  { id: '20000-40000', minKg: 20001, maxKg: 40000, label: '20,000 – 40,000 kg', popularVehicles: 'Multi-Axle 10/12/14 Wheeler, Tata 2818, BharatBenz 2823' },
  { id: '40000-50000', minKg: 40001, maxKg: 50000, label: '40,000 – 50,000 kg', popularVehicles: 'Heavy Trailer, Tata 4018/4923, BharatBenz 4028T' },
  { id: '50000+', minKg: 50001, maxKg: 999999, label: 'Above 50,000 kg', popularVehicles: 'Mega Prime Movers, 55 Ton Trailers, Heavy Haulers' },
];

export interface GCVRuleItem {
  gvw: string;
  policyType: 'ALL' | 'NORMAL' | 'NIL_DEP';
  choice: number;
  company: string;
  groupCode: string;
  discount: string;
  declinedRto: string;
  inspection: string;
  quoteFrom: string;
  modelAndRto: string;
  remarks: string;
  paCover: string;
  nilDepSource: string;
}

export const GCV_RULES: GCVRuleItem[] = [
  {
    "gvw": "0-2500",
    "policyType": "ALL",
    "choice": 1,
    "company": "Reliance / Indusind",
    "groupCode": "IS",
    "discount": "80/85",
    "declinedRto": "--",
    "inspection": "NO",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "TATA & MARUTI ALL MODEL allowed.\nMAHINDRA - JEETO & SUPRO only.\nALL RTO allowed.",
    "remarks": "RC BASED Nil Dep Ins nahi thai, Normal j thase.",
    "paCover": "375.0",
    "nilDepSource": "Click Here"
  },
  {
    "gvw": "0-2500",
    "policyType": "ALL",
    "choice": 2,
    "company": "SBI (upto 2000) (only TATA make upto 2500 GVW)",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "NO",
    "quoteFrom": "SELF, SBI",
    "modelAndRto": "ALL MAKE MODEL & ALL RTO.",
    "remarks": "TATA \u0aa8\u0ac0 \u0a97\u0abe\u0aa1\u0ac0 \u0ab9\u0acb\u0aaf \u0aa4\u0acb 2500 GVW \u0ab8\u0ac1\u0aa7\u0ac0 \u0aa5\u0ab6\u0ac7, Other upto 2000 GVW only.",
    "paCover": "325.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "0-2500",
    "policyType": "ALL",
    "choice": 3,
    "company": "SHRIRAM",
    "groupCode": "DC",
    "discount": "80.0",
    "declinedRto": "--",
    "inspection": "YES (IW)",
    "quoteFrom": "SELF, SHRIRAM",
    "modelAndRto": "ALL MAKE MODEL & ALL RTO Allowed,\nShriram HP Declined",
    "remarks": "Inspection Waiver is available (T+2 Days). Code Change mate puchhvu.\n\u0aaa\u0acb\u0ab2\u0ac0\u0ab8\u0ac0\u0aae\u0abe\u0a82 Shriram Finance \u0aa8\u0ac1\u0a82 HP \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0ab9\u0acb\u0aaf \u0aa4\u0acb \u0aa4\u0ac7\u0aa8\u0acb \u0ab5\u0ac0\u0aae\u0acb Shriram Company \u0aae\u0abe\u0a82 \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf.",
    "paCover": "315.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "0-2500",
    "policyType": "ALL",
    "choice": 4,
    "company": "TATA (upto 2000 GVW)",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "NO",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL MAKE MODEL & ALL RTO Allowed",
    "remarks": "Rate Sir ne puchhva",
    "paCover": "315.0",
    "nilDepSource": "Sama"
  },
  {
    "gvw": "0-2500",
    "policyType": "ALL",
    "choice": 5,
    "company": "LIBERTY (above 5 Years only)",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "NO",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL MAKE MODEL & ALL RTO",
    "remarks": "Rate Sir ne puchhva",
    "paCover": "375.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "2501-3500",
    "policyType": "ALL",
    "choice": 1,
    "company": "SHRIRAM (upto 2800 only)",
    "groupCode": "DC",
    "discount": "80.0",
    "declinedRto": "--",
    "inspection": "YES (IW)",
    "quoteFrom": "SELF, SHRIRAM",
    "modelAndRto": "ALL MAKE MODEL & ALL RTO Allowed,\nShriram HP Declined",
    "remarks": "Inspection Waiver is available (T+2 Days). Code Change mate puchhvu.\n\u0aaa\u0acb\u0ab2\u0ac0\u0ab8\u0ac0\u0aae\u0abe\u0a82 Shriram Finance \u0aa8\u0ac1\u0a82 HP \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0ab9\u0acb\u0aaf \u0aa4\u0acb \u0aa4\u0ac7\u0aa8\u0acb \u0ab5\u0ac0\u0aae\u0acb Shriram Company \u0aae\u0abe\u0a82 \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf.",
    "paCover": "315.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "2501-3500",
    "policyType": "ALL",
    "choice": 2,
    "company": "CHOLA",
    "groupCode": "DC",
    "discount": "80/85/87.5",
    "declinedRto": "--",
    "inspection": "YES (IW)",
    "quoteFrom": "SELF, CHOLA",
    "modelAndRto": "ALL RTO ALLOWED, ALL TANKERS DECLINED\nSeperate Rate for Models - Ace, Super Ace, Yodha, Xenon, Magic, Intra, Super Carry, Mahindra Jeeto, Tractor, Supro",
    "remarks": "PA COMPULSORY 550. Inspection Waiver is available (T+3 Days).\nONLY TATA MAKE 87.50% DISCOUNT.\nALL WITH NCB CASES - 85% DISCOUNT.\nWITHOUT NCB AS PER SYSTEM - CHOLA Group ma puchhvu.",
    "paCover": "550.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "2501-3500",
    "policyType": "ALL",
    "choice": 3,
    "company": "ICICI",
    "groupCode": "IS",
    "discount": "80/85",
    "declinedRto": "YES",
    "inspection": "NO",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL MAKE MODEL ALLOWED\nDeclined RTO \u0a93\u0aa5\u0acb\u0ab0\u0abf\u0a9f\u0ac0: Ahmedabad, Baroda, Surat, Rajkot, Gandhinagar, Amreli, Gandhidham, Bhuj, Banaskantha, Kheda, Navsari, Palanpur, Patan, Surendranagar, Tapi.",
    "remarks": "",
    "paCover": "599.0",
    "nilDepSource": "Click Here"
  },
  {
    "gvw": "2501-3500",
    "policyType": "ALL",
    "choice": 4,
    "company": "SBI",
    "groupCode": "IS",
    "discount": "75/80/85",
    "declinedRto": "--",
    "inspection": "NO",
    "quoteFrom": "SELF, SBI",
    "modelAndRto": "",
    "remarks": "Discount Grid - Below 5 Years 75\n5-10 Years 80% & 10-20 Years 85%.",
    "paCover": "315.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "2501-3500",
    "policyType": "ALL",
    "choice": 5,
    "company": "SHRIRAM (2800-3500 GVW)",
    "groupCode": "DC",
    "discount": "80.0",
    "declinedRto": "--",
    "inspection": "YES (IW)",
    "quoteFrom": "SELF, SHRIRAM",
    "modelAndRto": "ALL MAKE MODEL & ALL RTO Allowed,\nShriram HP Declined",
    "remarks": "Inspection Waiver is available (T+2 Days). Code Change mate puchhvu.\n\u0aaa\u0acb\u0ab2\u0ac0\u0ab8\u0ac0\u0aae\u0abe\u0a82 Shriram Finance \u0aa8\u0ac1\u0a82 HP \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0ab9\u0acb\u0aaf \u0aa4\u0acb \u0aa4\u0ac7\u0aa8\u0acb \u0ab5\u0ac0\u0aae\u0acb Shriram Company \u0aae\u0abe\u0a82 \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf.",
    "paCover": "315.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "3501-7500",
    "policyType": "ALL",
    "choice": 1,
    "company": "ICICI",
    "groupCode": "IS",
    "discount": "Website",
    "declinedRto": "REMARKS",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "DECLINED RTO Reg. Auth - Ahmedabad, Rajkot, Surat, Ahmedabad East, Gandhidham, Gandhinagar",
    "remarks": "Normal \u0a85\u0aa8\u0ac7 Nil Dep \u0aa8\u0abe\u0a82 \u0a95\u0acb\u0a9f\u0ac7\u0ab6\u0aa8 ICICI \u0aa8\u0ac0 \u0ab5\u0ac7\u0aac\u0ab8\u0abe\u0a88\u0a9f \u0aae\u0abe\u0a82\u0aa5\u0ac0 \u0a95\u0abe\u0aa2\u0ab5\u0abe.",
    "paCover": "599.0",
    "nilDepSource": "Click Here"
  },
  {
    "gvw": "3501-7500",
    "policyType": "ALL",
    "choice": 2,
    "company": "SHRIRAM (0 NCB Cases Declined)",
    "groupCode": "DC",
    "discount": "80.0",
    "declinedRto": "GJ03",
    "inspection": "YES",
    "quoteFrom": "SELF, SHRIRAM",
    "modelAndRto": "Without NCB Declined",
    "remarks": "With NCB case allowed only. GJ03 hoya ane RTO Authority Rajkot sivay ni hoy to System mathi quotation kadhavvu.",
    "paCover": "315.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "3501-7500",
    "policyType": "ALL",
    "choice": 3,
    "company": "TATA",
    "groupCode": "IS",
    "discount": "SYSTEM",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL MAKE MODEL & RTOs ALLOWED",
    "remarks": "RTO - GJ03, 05, 28 mate Tata 1st choice chhe\nRate Sir ne puchhva",
    "paCover": "315.0",
    "nilDepSource": "SAMA"
  },
  {
    "gvw": "3501-7500",
    "policyType": "ALL",
    "choice": 4,
    "company": "ORIENTAL",
    "groupCode": "IS",
    "discount": "80.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "Sama",
    "modelAndRto": "ALL MAKE MODEL & RTOs ALLOWED",
    "remarks": "",
    "paCover": "375.0",
    "nilDepSource": "SYSTEM"
  },
  {
    "gvw": "3501-7500",
    "policyType": "ALL",
    "choice": 5,
    "company": "UNIVERSAL SOMPO",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "",
    "inspection": "YES",
    "quoteFrom": "SELF, SHRIRAM",
    "modelAndRto": "",
    "remarks": "",
    "paCover": "375.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "3501-7500",
    "policyType": "ALL",
    "choice": 6,
    "company": "CHOLA (Puru Premium levu)",
    "groupCode": "DC",
    "discount": "70-85",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, CHOLA",
    "modelAndRto": "ALL MAKE MODEL & ALL RTO ALLOWED\nALL TANKERS DECLINED",
    "remarks": "70% Discount in Eicher.\nWITH NCB CASES - 85% DISCOUNT.\nWITHOUT NCB AS PER SYSTEM (MIN 80%)\nPA 750 COMPULSORY. Puru Premium levu.",
    "paCover": "750.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "7501-12000",
    "policyType": "ALL",
    "choice": 1,
    "company": "SHRIRAM",
    "groupCode": "DC",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SHRIRAM",
    "modelAndRto": "All RTO Allowed\nBHARATBENZ, SHRIRAM HP DECLINED",
    "remarks": "\u0aaa\u0acb\u0ab2\u0ac0\u0ab8\u0ac0\u0aae\u0abe\u0a82 Shriram Finance \u0aa8\u0ac1\u0a82 HP \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0ab9\u0acb\u0aaf \u0aa4\u0acb \u0aa4\u0ac7\u0aa8\u0acb \u0ab5\u0ac0\u0aae\u0acb Shriram Company \u0aae\u0abe\u0a82 \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf.",
    "paCover": "315.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "7501-12000",
    "policyType": "ALL",
    "choice": 2,
    "company": "UNIVERSAL SOMPO (Remarks)",
    "groupCode": "IS",
    "discount": "75-90",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "All RTO Allowed\nBHARATBENZ DECLINED",
    "remarks": "Discount - 90%\nGJ36, GJ39, GJ10, GJ12 RTO hoy ane above 3 Years hoy to Discount - Ashok Leyland 80%, Eicher 75%.",
    "paCover": "375.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "7501-12000",
    "policyType": "ALL",
    "choice": 3,
    "company": "TATA",
    "groupCode": "IS",
    "discount": "SYSTEM",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL MAKE MODEL & RTOs ALLOWED",
    "remarks": "RTO - GJ03, 05, 28 mate Tata 1st choice chhe\nRate Sir ne puchhva",
    "paCover": "315.0",
    "nilDepSource": "SAMA"
  },
  {
    "gvw": "7501-12000",
    "policyType": "ALL",
    "choice": 4,
    "company": "MAGMA",
    "groupCode": "DC",
    "discount": "System",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "BHARATBENZ DECLINED",
    "remarks": "RTO Reg. Authority mate 1st Choice - Ahmedabad, Bavla, Surat, Baroda, Valsad, Bharuch, Gandhinagar, Bardoli, Navsari, Anand, Gandhidham.",
    "paCover": "450.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "7501-12000",
    "policyType": "ALL",
    "choice": 5,
    "company": "HDFC",
    "groupCode": "DC",
    "discount": "System",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "HDFC",
    "modelAndRto": "ALL MAKE MODEL & RTOs ALLOWED",
    "remarks": "Normal ma Puru Premium\nNil Dep na Rate Sir ne puchhva",
    "paCover": "375.0",
    "nilDepSource": "HDFC"
  },
  {
    "gvw": "7501-12000",
    "policyType": "ALL",
    "choice": 6,
    "company": "ICICI\nPuru Premium levu",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL MAKE MODEL & RTOs ALLOWED",
    "remarks": "Puru Premium",
    "paCover": "599.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "7501-12000",
    "policyType": "ALL",
    "choice": 7,
    "company": "ROYAL (Puru Premium levu)",
    "groupCode": "IS",
    "discount": "82-87",
    "declinedRto": "GJ03",
    "inspection": "YES",
    "quoteFrom": "SAMA",
    "modelAndRto": "DISCOUNT - TATA & AL 87%\nEicher, Bharatbenz, Mahindra - 82%",
    "remarks": "Rate Sir ne puchhva. \nNil Dep. Waiver : Clause A - IMT 50%. Clause B - IMT 100%.",
    "paCover": "315.0",
    "nilDepSource": "SYSTEM"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NORMAL",
    "choice": 1,
    "company": "SBI (Above 5 Years)",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SBI",
    "modelAndRto": "TATA, AL allowed,\n(EICHER & BHARATBENZ DECLINED)",
    "remarks": "Mahindra make ma puru premium levu",
    "paCover": "315.0",
    "nilDepSource": "--"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NORMAL",
    "choice": 2,
    "company": "UNIVERSAL SOMPO (Remarks)",
    "groupCode": "IS",
    "discount": "75-90",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "All RTO Allowed\nBHARATBENZ DECLINED",
    "remarks": "Discount - Tata & Mahindra 90% fix.\nGJ36, GJ39, GJ10, GJ12 RTO hoy ane above 3 Years hoy to Discount - Ashok Leyland 80%, Eicher 75%.",
    "paCover": "375.0",
    "nilDepSource": "Click Here"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NORMAL",
    "choice": 3,
    "company": "SHRIRAM",
    "groupCode": "DC",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SHRIRAM",
    "modelAndRto": "BHARATBENZ, SHRIRAM HP DECLINED",
    "remarks": "\u0aaa\u0acb\u0ab2\u0ac0\u0ab8\u0ac0\u0aae\u0abe\u0a82 Shriram Finance \u0aa8\u0ac1\u0a82 HP \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0ab9\u0acb\u0aaf \u0aa4\u0acb \u0aa4\u0ac7\u0aa8\u0acb \u0ab5\u0ac0\u0aae\u0acb Shriram Company \u0aae\u0abe\u0a82 \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf.",
    "paCover": "315.0",
    "nilDepSource": "-"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NORMAL",
    "choice": 4,
    "company": "ROYAL",
    "groupCode": "IS",
    "discount": "82-87",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL RTOs Allowed.",
    "remarks": "DISCOUNT - TATA & AL 87%\nEicher, Bharatbenz, Mahindra - 82%",
    "paCover": "315.0",
    "nilDepSource": "--"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NORMAL",
    "choice": 5,
    "company": "ICICI",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL MAKE MODEL & RTOs ALLOWED",
    "remarks": "HAZARDOUS TANKERS (PETROL, DIESEL, CHEMICAL, GAS) ALLOWED\nRate Sir ne puchhva",
    "paCover": "599.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NORMAL",
    "choice": 6,
    "company": "SBI (Below 5 Years)",
    "groupCode": "IS",
    "discount": "85.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SBI",
    "modelAndRto": "TATA, AL, Mahindra allowed,\n(EICHER & BHARATBENZ DECLINED)",
    "remarks": "",
    "paCover": "315.0",
    "nilDepSource": "SYSTEM"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NORMAL",
    "choice": 7,
    "company": "MAGMA (above 5 years only)",
    "groupCode": "DC",
    "discount": "Discount",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "BHARATBENZ DECLINED",
    "remarks": "Rate Sir ne puchhva",
    "paCover": "450.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NIL_DEP",
    "choice": 1,
    "company": "SHRIRAM",
    "groupCode": "DC",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SHRIRAM",
    "modelAndRto": "BHARATBENZ, SHRIRAM HP DECLINED",
    "remarks": "Bharatbenz as per System",
    "paCover": "315.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NIL_DEP",
    "choice": 2,
    "company": "UNIVERSAL SOMPO (Remarks)",
    "groupCode": "IS",
    "discount": "75-90",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SAMA",
    "modelAndRto": "All RTO Allowed\nBHARATBENZ DECLINED",
    "remarks": "Discount - Tata & Mahindra 90% fix.\nGJ36, GJ39, GJ10, GJ12 RTO hoy ane above 3 Years hoy to Discount - Ashok Leyland 80%, Eicher 75%.",
    "paCover": "375.0",
    "nilDepSource": "Click Here"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NIL_DEP",
    "choice": 3,
    "company": "ROYAL",
    "groupCode": "IS",
    "discount": "82-87",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SAMA",
    "modelAndRto": "ALL RTOs Allowed.",
    "remarks": "DISCOUNT - TATA & AL 87%\nEicher, Bharatbenz, Mahindra - 82%\nNil Dep. Waiver : Clause A - IMT 75%. Clause B - IMT 100%.",
    "paCover": "315.0",
    "nilDepSource": "SYSTEM"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NIL_DEP",
    "choice": 4,
    "company": "ICICI",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL MAKE MODEL & RTO ALLOWED",
    "remarks": "HAZARDOUS TANKERS (PETROL, DIESEL, CHEMICAL, GAS) ALLOWED",
    "paCover": "599.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NIL_DEP",
    "choice": 5,
    "company": "CHOLA",
    "groupCode": "DC",
    "discount": "70-90",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, CHOLA",
    "modelAndRto": "ALL MAKE MODEL & RTO ALLOWED",
    "remarks": "WITH NCB - 90% DISCOUNT\nWITHOUT NCB - Minimum 82.5% (Max as per System)\nEICHER 70% DISCOUNT FIX. PA 750 COMPULSORY.",
    "paCover": "750.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "12000-20000",
    "policyType": "NIL_DEP",
    "choice": 6,
    "company": "SBI",
    "groupCode": "IS",
    "discount": "85.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SBI",
    "modelAndRto": "TATA, AL, Mahindra allowed,\n(EICHER & BHARATBENZ DECLINED)",
    "remarks": "",
    "paCover": "315.0",
    "nilDepSource": "Click here"
  },
  {
    "gvw": "20000-40000",
    "policyType": "NORMAL",
    "choice": 1,
    "company": "SBI (Above 5 Years)",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SBI",
    "modelAndRto": "TATA, AL, Mahindra allowed,\n(EICHER & BHARATBENZ DECLINED)",
    "remarks": "Below 5 Years 85% Discount only",
    "paCover": "315.0",
    "nilDepSource": "-"
  },
  {
    "gvw": "20000-40000",
    "policyType": "NORMAL",
    "choice": 2,
    "company": "CHOLA",
    "groupCode": "DC",
    "discount": "70-90",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, CHOLA",
    "modelAndRto": "ALL MODEL ALL RTO.",
    "remarks": "WITH NCB - 90% DISCOUNT\nWITHOUT NCB - Minimum 82.5% (Max as per System)\nEICHER 70% DISCOUNT FIX. PA 750 COMPULSORY.",
    "paCover": "750.0",
    "nilDepSource": "-"
  },
  {
    "gvw": "20000-40000",
    "policyType": "NORMAL",
    "choice": 3,
    "company": "UNIVERSAL SOMPO (Remarks)",
    "groupCode": "IS",
    "discount": "75-90",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SAMA",
    "modelAndRto": "All RTO Allowed\nBHARATBENZ DECLINED",
    "remarks": "Discount - Tata & Mahindra All model 90%.\nBelow 3 Year ma AL & Eicher ma 90%.\nGJ36, GJ39, GJ10, GJ12 sivay na RTO ma Tata, AL, Eicher 90%.\nGJ36, GJ39, GJ10, GJ12 RTO hoy ane above 3 Years hoy to Discount - Ashok Leyland 80%, Eicher 75%.",
    "paCover": "375.0",
    "nilDepSource": "Nil Dep Rate"
  },
  {
    "gvw": "20000-40000",
    "policyType": "NORMAL",
    "choice": 4,
    "company": "ROYAL",
    "groupCode": "IS",
    "discount": "82-87",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF",
    "modelAndRto": "All RTOs Allowed",
    "remarks": "DISCOUNT - TATA & AL 87% - Rate ma 4% Plus karva.\nEicher, Bharatbenz, Mahindra - 82%.",
    "paCover": "315.0",
    "nilDepSource": "-"
  },
  {
    "gvw": "20000-40000",
    "policyType": "NORMAL",
    "choice": 5,
    "company": "SHRIRAM",
    "groupCode": "DC",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SHRIRAM",
    "modelAndRto": "BHARATBENZ, SHRIRAM HP DECLINED",
    "remarks": "\u0aaa\u0acb\u0ab2\u0ac0\u0ab8\u0ac0\u0aae\u0abe\u0a82 Shriram Finance \u0aa8\u0ac1\u0a82 HP \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0ab9\u0acb\u0aaf \u0aa4\u0acb \u0aa4\u0ac7\u0aa8\u0acb \u0ab5\u0ac0\u0aae\u0acb Shriram Company \u0aae\u0abe\u0a82 \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf.",
    "paCover": "315.0",
    "nilDepSource": "-"
  },
  {
    "gvw": "20000-40000",
    "policyType": "NORMAL",
    "choice": 6,
    "company": "ICICI",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL MAKE MODEL & RTO ALLOWED",
    "remarks": "HAZARDOUS TANKERS (PETROL, DIESEL, CHEMICAL, GAS) ALLOWED.",
    "paCover": "599.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "20000-40000",
    "policyType": "NIL_DEP",
    "choice": 1,
    "company": "CHOLA",
    "groupCode": "IS",
    "discount": "70-90",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, CHOLA",
    "modelAndRto": "ALL MODEL ALL RTO.",
    "remarks": "WITH NCB - 90% DISCOUNT\nWITHOUT NCB - Minimum 82.5% (Max as per System)\nEICHER 70% DISCOUNT FIX. PA 750 COMPULSORY.",
    "paCover": "750.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "20000-40000",
    "policyType": "NIL_DEP",
    "choice": 2,
    "company": "SHRIRAM",
    "groupCode": "DC",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SHRIRAM",
    "modelAndRto": "BHARATBENZ, SHRIRAM HP DECLINED",
    "remarks": "\u0aaa\u0acb\u0ab2\u0ac0\u0ab8\u0ac0\u0aae\u0abe\u0a82 Shriram Finance \u0aa8\u0ac1\u0a82 HP \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0ab9\u0acb\u0aaf \u0aa4\u0acb \u0aa4\u0ac7\u0aa8\u0acb \u0ab5\u0ac0\u0aae\u0acb Shriram Company \u0aae\u0abe\u0a82 \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf.",
    "paCover": "315.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "20000-40000",
    "policyType": "NIL_DEP",
    "choice": 3,
    "company": "ICICI",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL MAKE MODEL & RTO ALLOWED",
    "remarks": "HAZARDOUS TANKERS (PETROL, DIESEL, CHEMICAL, GAS) ALLOWED.",
    "paCover": "599.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "20000-40000",
    "policyType": "NIL_DEP",
    "choice": 4,
    "company": "UNIVERSAL SOMPO (Remarks)",
    "groupCode": "IS",
    "discount": "75-90",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SAMA",
    "modelAndRto": "All RTO Allowed\nBHARATBENZ DECLINED",
    "remarks": "Discount - Tata All model 90%. Below 3 Year ma AL & Eicher ma 90%.\nGJ36, GJ39, GJ10, GJ12 sivay na RTO ma Tata, AL, Eicher 90%.\nGJ36, GJ39, GJ10, GJ12 RTO hoy ane above 3 Years hoy to Discount - Ashok Leyland 80%, Eicher 75%.",
    "paCover": "375.0",
    "nilDepSource": "Nil Dep Rate"
  },
  {
    "gvw": "20000-40000",
    "policyType": "NIL_DEP",
    "choice": 5,
    "company": "ROYAL",
    "groupCode": "IS",
    "discount": "82-87",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF",
    "modelAndRto": "All RTOs Allowed",
    "remarks": "DISCOUNT - TATA & AL 87%.\nEicher, Bharatbenz, Mahindra - 82%.\nNil Dep. Waiver : Clause A - IMT 50%. Clause B - IMT 100%.",
    "paCover": "315.0",
    "nilDepSource": "SAMA"
  },
  {
    "gvw": "40000-50000",
    "policyType": "NORMAL",
    "choice": 1,
    "company": "RELIANCE / INDUSIND",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALLOWED - TATA & ASHOK LEYLAND.\nDECLINED - EICHER, BHARATBENZ, MAHINDRA.",
    "remarks": "TOWING - 1000 RS MA 10000 RS NU COVER, 1500 RS MA 15000 NU COVER",
    "paCover": "375.0",
    "nilDepSource": "SYSTEM"
  },
  {
    "gvw": "40000-50000",
    "policyType": "NORMAL",
    "choice": 2,
    "company": "ICICI",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL MAKE MODEL & RTO ALLOWED\nBHARATBENZ & MAHINDRA na Rate Sir ne puchhva.",
    "remarks": "",
    "paCover": "599.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "40000-50000",
    "policyType": "NORMAL",
    "choice": 3,
    "company": "UNIVERSAL SOMPO",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "Self, Sama",
    "modelAndRto": "All RTO Allowed\nBHARATBENZ & MAHINDRA DECLINED",
    "remarks": "Discount - Tata 90% fix.\nGJ36, GJ39, GJ10, GJ12 RTO ma above 3 Years hoy to Discount - Ashok Leyland 80%, Eicher 75%.",
    "paCover": "375.0",
    "nilDepSource": "Click Here"
  },
  {
    "gvw": "40000-50000",
    "policyType": "NORMAL",
    "choice": 4,
    "company": "SHRIRAM",
    "groupCode": "DC",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "Self, Shriram",
    "modelAndRto": "BHARATBENZ, SHRIRAM HP DECLINED",
    "remarks": "\u0aaa\u0acb\u0ab2\u0ac0\u0ab8\u0ac0\u0aae\u0abe\u0a82 Shriram Finance \u0aa8\u0ac1\u0a82 HP \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0ab9\u0acb\u0aaf \u0aa4\u0acb \u0aa4\u0ac7\u0aa8\u0acb \u0ab5\u0ac0\u0aae\u0acb Shriram Company \u0aae\u0abe\u0a82 \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf.",
    "paCover": "315.0",
    "nilDepSource": "-"
  },
  {
    "gvw": "40000-50000",
    "policyType": "NORMAL",
    "choice": 5,
    "company": "ROYAL (Puru Premium)",
    "groupCode": "IS",
    "discount": "82-87",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "Self, Sama",
    "modelAndRto": "",
    "remarks": "DISCOUNT - TATA & AL 87%.\nEicher, Bharatbenz, Mahindra - 82%.",
    "paCover": "315.0",
    "nilDepSource": ""
  },
  {
    "gvw": "40000-50000",
    "policyType": "NORMAL",
    "choice": 6,
    "company": "GO DIGIT (upto 43000 GVW) Rate Sir ne puchhva",
    "groupCode": "IS",
    "discount": "SYSTEM",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "Sama",
    "modelAndRto": "SYSTEM",
    "remarks": "",
    "paCover": "",
    "nilDepSource": "SYSTEM"
  },
  {
    "gvw": "40000-50000",
    "policyType": "NIL_DEP",
    "choice": 1,
    "company": "SHRIRAM",
    "groupCode": "DC",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "Self, Shriram",
    "modelAndRto": "BHARATBENZ, SHRIRAM HP DECLINED",
    "remarks": "\u0aaa\u0acb\u0ab2\u0ac0\u0ab8\u0ac0\u0aae\u0abe\u0a82 Shriram Finance \u0aa8\u0ac1\u0a82 HP \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0ab9\u0acb\u0aaf \u0aa4\u0acb \u0aa4\u0ac7\u0aa8\u0acb \u0ab5\u0ac0\u0aae\u0acb Shriram Company \u0aae\u0abe\u0a82 \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf.",
    "paCover": "315.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "40000-50000",
    "policyType": "NIL_DEP",
    "choice": 2,
    "company": "RELIANCE / INDUSIND",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALLOWED - TATA & ASHOK LEYLAND.\nDECLINED - EICHER, BHARATBENZ, MAHINDRA.",
    "remarks": "TOWING - 1000 RS MA 10000 RS NU COVER, 1500 RS MA 15000 NU COVER",
    "paCover": "375.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "40000-50000",
    "policyType": "NIL_DEP",
    "choice": 3,
    "company": "ICICI",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "ALL MAKE MODEL & RTO ALLOWED\nBHARATBENZ & MAHINDRA na Rate Sir ne puchhva.",
    "remarks": "",
    "paCover": "599.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "40000-50000",
    "policyType": "NIL_DEP",
    "choice": 4,
    "company": "UNIVERSAL SOMPO",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "Self, Sama",
    "modelAndRto": "All RTO Allowed\nBHARATBENZ & MAHINDRA DECLINED",
    "remarks": "Discount - Tata 90% fix.\nGJ36, GJ39, GJ10, GJ12 RTO ma above 3 Years hoy to Discount - Ashok Leyland 80%, Eicher 75%.",
    "paCover": "375.0",
    "nilDepSource": "Nil Dep Rate"
  },
  {
    "gvw": "40000-50000",
    "policyType": "NIL_DEP",
    "choice": 5,
    "company": "ROYAL (Puru Premium)",
    "groupCode": "IS",
    "discount": "82-87",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "Sama",
    "modelAndRto": "",
    "remarks": "DISCOUNT - TATA & AL 87%.\nEicher, Bharatbenz, Mahindra - 82%.",
    "paCover": "315.0",
    "nilDepSource": "SYSTEM"
  },
  {
    "gvw": "40000-50000",
    "policyType": "NIL_DEP",
    "choice": 6,
    "company": "GO DIGIT (upto 43000 GVW) Rate Sir ne puchhva",
    "groupCode": "IS",
    "discount": "SYSTEM",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "Self, Sama",
    "modelAndRto": "SYSTEM",
    "remarks": "",
    "paCover": "",
    "nilDepSource": "SYSTEM"
  },
  {
    "gvw": "50000+",
    "policyType": "ALL",
    "choice": 1,
    "company": "RELIANCE / INDUSIND",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SAMA",
    "modelAndRto": "ALLOWED - TATA & ASHOK LEYLAND.\nDECLINED - EICHER, BHARATBENZ, MAHINDRA.",
    "remarks": "TOWING - 1000 RS MA 10000 RS NU COVER, 1500 RS MA 15000 NU COVER",
    "paCover": "375.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "50000+",
    "policyType": "ALL",
    "choice": 2,
    "company": "UNIVERSAL SOMPO (upto 55000)",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "DECLINED - EICHER, BHARATBENZ, MAHINDRA.",
    "remarks": "Discount - Tata 90% fix.\nGJ36, GJ39, GJ10, GJ12 RTO ma above 3 Years hoy to Discount - Ashok Leyland 80%, Eicher 75%.",
    "paCover": "315.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "50000+",
    "policyType": "ALL",
    "choice": 3,
    "company": "ICICI",
    "groupCode": "IS",
    "discount": "90.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SAMA",
    "modelAndRto": "BHARATBENZ & MAHINDRA na Rate Sir ne puchhva.",
    "remarks": "",
    "paCover": "599.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "50000+",
    "policyType": "ALL",
    "choice": 4,
    "company": "SHRIRAM (upto 55000)",
    "groupCode": "DC",
    "discount": "70.0",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SELF, SHRIRAM",
    "modelAndRto": "BHARATBENZ, SHRIRAM HP DECLINED",
    "remarks": "\u0aaa\u0acb\u0ab2\u0ac0\u0ab8\u0ac0\u0aae\u0abe\u0a82 Shriram Finance \u0aa8\u0ac1\u0a82 HP \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0ab9\u0acb\u0aaf \u0aa4\u0acb \u0aa4\u0ac7\u0aa8\u0acb \u0ab5\u0ac0\u0aae\u0acb Shriram Company \u0aae\u0abe\u0a82 \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf.",
    "paCover": "315.0",
    "nilDepSource": "NIL DEP RATE"
  },
  {
    "gvw": "50000+",
    "policyType": "ALL",
    "choice": 5,
    "company": "ROYAL (Puru Premium levu)",
    "groupCode": "IS",
    "discount": "82-87",
    "declinedRto": "--",
    "inspection": "YES",
    "quoteFrom": "SAMA",
    "modelAndRto": "",
    "remarks": "DISCOUNT - TATA & AL 87%.\nEicher, Bharatbenz, Mahindra - 82%.\nNil Dep. Waiver : Clause A - IMT 50%. Clause B - IMT 100%.",
    "paCover": "315.0",
    "nilDepSource": "SYSTEM"
  }
];

export interface TPGCVItem {
  gvw: string;
  company: string;
  premium: string;
  rate: string;
}

export const TP_GCV_RATES: TPGCVItem[] = [
  {
    "gvw": "UPTO 2000",
    "company": "Reliance IS, SBI IS",
    "premium": "17500.0",
    "rate": "11000 - RELIANCE (MAKE: TATA & MARUTI. MAHINDRA JEETO & SUPRO models only)\n11500 - SBI (TATA & MARUTI sivay na make, MAHINDRA JEETO & SUPRO sivay na model mate)"
  },
  {
    "gvw": "2000-2500",
    "company": "SBI IS, Shriram DC",
    "premium": "17500.0",
    "rate": "11000 - SBI (for TATA make only)\n11500 - SHRIRAM (TATA make sivay)"
  },
  {
    "gvw": "2501-2800",
    "company": "Shriram DC",
    "premium": "17500.0",
    "rate": "11500 - SHRIRAM"
  },
  {
    "gvw": "2801-3500",
    "company": "SBI IS",
    "premium": "17500.0",
    "rate": "12500 - SBI"
  },
  {
    "gvw": "3501-7500",
    "company": "TATA IS, ICICI IS",
    "premium": "17500.0",
    "rate": "14000 - TATA (RTO - GJ01, 03, 27 \u0ab9\u0acb\u0aaf \u0aa4\u0acb)\n14500 ICICI (GJ01, 03, 27 \u0ab8\u0abf\u0ab5\u0abe\u0aaf\u0aa8\u0abe\u0a82 RTO \u0aae\u0abe\u0a9f\u0ac7. Declined RTO \u0a93\u0aa5\u0acb\u0ab0\u0abf\u0a9f\u0ac0 - \u0a85\u0aae\u0aa6\u0abe\u0ab5\u0abe\u0aa6, \u0aac\u0ab0\u0acb\u0aa1\u0abe, \u0ab8\u0ac1\u0ab0\u0aa4, \u0ab0\u0abe\u0a9c\u0a95\u0acb\u0a9f, \u0a97\u0abe\u0a82\u0aa7\u0ac0\u0aa8\u0a97\u0ab0)"
  },
  {
    "gvw": "7501-12000",
    "company": "TATA IS, ICICI IS",
    "premium": "29000.0",
    "rate": "20500 - TATA (RTO - GJ01, 03, 27 \u0ab9\u0acb\u0aaf \u0aa4\u0acb)\n21000 - ICICI (RTO - GJ01, 03, 27 sivay na RTO mate)"
  },
  {
    "gvw": "12001-20000",
    "company": "ICICI IS",
    "premium": "38000.0",
    "rate": "25500 - ICICI"
  },
  {
    "gvw": "20001-40000",
    "company": "ICICI IS",
    "premium": "46700.0",
    "rate": "30000 - ICICI"
  },
  {
    "gvw": "ABOVE 40000",
    "company": "ICICI IS",
    "premium": "47000.0",
    "rate": "33500 - ICICI"
  }
];

export interface TP2WItem {
  category: string;
  company: string;
  rate: string;
}

export const TP_2W_RATES: TP2WItem[] = [
  {
    "category": "BIKE (Upto 150 CC)",
    "company": "ANY COMPANY",
    "rate": "850.0"
  },
  {
    "category": "BIKE (151 CC-350 CC)",
    "company": "ANY COMPANY",
    "rate": "1600.0"
  },
  {
    "category": "BIKE (ABOVE 350 CC)",
    "company": "ANY COMPANY",
    "rate": "3300.0"
  }
];

export interface TPLMVItem {
  segment: string;
  plan: string;
  rate: string;
}

export const TP_LMV_RATES: TPLMVItem[] = [
  {
    "segment": "UPTO 1000 CC\n(EX. ALTO, CELERIO, KWID, EON ETC)",
    "plan": "ONLY TP",
    "rate": "2500.0"
  },
  {
    "segment": "",
    "plan": "WITH OWNER PA - 15 LAKH",
    "rate": "2800.0"
  },
  {
    "segment": "",
    "plan": "WITH OWNER PA & PASSENGER PA",
    "rate": "3200.0"
  },
  {
    "segment": "BETWEEN 1001-1500 CC\n(EX. SWIFT, i10, i20, CRETA, BALENO, VENUE, SELTOS ETC)",
    "plan": "ONLY TP",
    "rate": "4000.0"
  },
  {
    "segment": "",
    "plan": "WITH OWNER PA - 15 LAKH",
    "rate": "4500.0"
  },
  {
    "segment": "",
    "plan": "WITH OWNER PA & PASSENGER PA",
    "rate": "4800.0"
  },
  {
    "segment": "ABOVE 1500 CC\n(EX. SCORPIO, SAFARI, FORTUNER, INNOVA, THAR ETC)",
    "plan": "ONLY TP",
    "rate": "9300.0"
  },
  {
    "segment": "",
    "plan": "WITH OWNER PA - 15 LAKH",
    "rate": "9800.0"
  },
  {
    "segment": "",
    "plan": "WITH OWNER PA & PASSENGER PA",
    "rate": "10200.0"
  }
];

export interface PCVRuleItem {
  category: string;
  choice: number;
  company: string;
  quoteFrom: string;
  discount: string;
  declined: string;
  inspection: string;
  remarks: string;
}

export const PCV_RULES: PCVRuleItem[] = [
  {
    "category": "TAXI UP TO 6 PASSENGER\nNORMAL & NIL DEP\n(Like Swift, Ertiga, Aura, Innova, Bolero, Xcent etc)\n(IMT 23 \u0aa8\u0aa5\u0ac0 \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82)",
    "choice": 1,
    "company": "SHRIRAM",
    "quoteFrom": "Shriram",
    "discount": "85.0",
    "declined": "Force Motors / Toofan Declined",
    "inspection": "YES",
    "remarks": "NIL DEP RATE."
  },
  {
    "category": "TAXI UP TO 6 PASSENGER\nNORMAL & NIL DEP\n(Like Swift, Ertiga, Aura, Innova, Bolero, Xcent etc)\n(IMT 23 \u0aa8\u0aa5\u0ac0 \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82)",
    "choice": 2,
    "company": "GCI - FUTURE GENERALI",
    "quoteFrom": "GCI",
    "discount": "System",
    "declined": "GJ10, 17, 20, 25, 35, \nEeco Declined",
    "inspection": "YES",
    "remarks": "Max upto 4+1 Seater allowed"
  },
  {
    "category": "TAXI UP TO 6 PASSENGER\nNORMAL & NIL DEP\n(Like Swift, Ertiga, Aura, Innova, Bolero, Xcent etc)\n(IMT 23 \u0aa8\u0aa5\u0ac0 \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82)",
    "choice": 3,
    "company": "Reliance / Indusind",
    "quoteFrom": "Sama",
    "discount": "70.0",
    "declined": "--",
    "inspection": "YES",
    "remarks": "NIL DEP \u0aa5\u0ab6\u0ac7 SYSTEM \u0aae\u0abe\u0a82\u0aa5\u0ac0 QUOTE \u0a95\u0aa2\u0abe\u0ab5\u0ab5\u0ac1\u0a82, 7 SEATER \u0ab8\u0ac1\u0aa7\u0ac0 \u0aa5\u0ab6\u0ac7"
  },
  {
    "category": "TAXI UP TO 6 PASSENGER\nNORMAL & NIL DEP\n(Like Swift, Ertiga, Aura, Innova, Bolero, Xcent etc)\n(IMT 23 \u0aa8\u0aa5\u0ac0 \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82)",
    "choice": 4,
    "company": "SBI",
    "quoteFrom": "SBI",
    "discount": "70.0",
    "declined": "Allowed RTO: GJ01, 05, 06, 07, 18, 22, 23, 27.\nOther Declined",
    "inspection": "YES",
    "remarks": "\u0a85\u0aae\u0ac1\u0a95 RTO \u0a85\u0aa8\u0ac7 MODEL DECLINE \u0a9b\u0ac7 \u0a8f\u0a9f\u0ab2\u0ac7 \u0ab8\u0abf\u0ab8\u0acd\u0a9f\u0aae\u0aae\u0abe\u0a82\u0aa5\u0ac0 \u0a9c QUOTE \u0a95\u0aa2\u0abe\u0ab5\u0ab5\u0ac1\u0a82"
  },
  {
    "category": "MAXI ABOVE 6 & UPTO 20 PASSENGER\nNORMAL & NIL DEP \n(Like scorpio, tata magic, omni etc)\n(IMT 23 \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0a9b\u0ac7)",
    "choice": 1,
    "company": "UNITED (UPTO 20 SEATER)",
    "quoteFrom": "Sama",
    "discount": "80.0",
    "declined": "--",
    "inspection": "YES",
    "remarks": "NIL DEP \u0aa5\u0ab6\u0ac7 SYSTEM \u0aae\u0abe\u0a82\u0aa5\u0ac0 QUOTE \u0a95\u0aa2\u0abe\u0ab5\u0ab5\u0ac1\u0a82.\n\u0ab0\u0ac7\u0a9f \u0aa4\u0acc\u0aab\u0ac0\u0a95 \u0ab8\u0ab0\u0aa8\u0ac7 \u0aaa\u0ac2\u0a9b\u0ab5\u0abe."
  },
  {
    "category": "MAXI ABOVE 6 & UPTO 20 PASSENGER\nNORMAL & NIL DEP \n(Like scorpio, tata magic, omni etc)\n(IMT 23 \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0a9b\u0ac7)",
    "choice": 2,
    "company": "IFFCO (UPTO 18 SEATER)",
    "quoteFrom": "Sama",
    "discount": "70.0",
    "declined": "--",
    "inspection": "YES",
    "remarks": ""
  },
  {
    "category": "SCHOOL BUS\n\u0ab9\u0a82\u0aae\u0ac7\u0ab6\u0abe NORMAL FULL \u0a9c \u0ab5\u0ac0\u0aae\u0acb \u0a95\u0ab0\u0ab5\u0abe\u0aa8\u0acb \u0ab9\u0acb\u0aaf, NIL DEP \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf\nIMT 23 \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0a9b\u0ac7",
    "choice": 1,
    "company": "Reliance / Indusind",
    "quoteFrom": "Self, Sama",
    "discount": "95.0",
    "declined": "--",
    "inspection": "YES",
    "remarks": "\u0ab8\u0acd\u0a95\u0ac2\u0ab2 \u0a95\u0ac7 \u0a9f\u0acd\u0ab0\u0ab8\u0acd\u0a9f\u0aa8\u0abe \u0aa8\u0abe\u0aae \u0aaa\u0ab0 \u0a97\u0abe\u0aa1\u0ac0 \u0aa8 \u0ab9\u0acb\u0aaf \u0aa4\u0acb\nNotorized Agreement, Permit \u0a85\u0aa8\u0ac7 School Letter\n\u0ab9\u0ab6\u0ac7 \u0aa4\u0acb \u0a9c \u0ab8\u0acd\u0a95\u0ac2\u0ab2 \u0aac\u0ab8 \u0aa4\u0ab0\u0ac0\u0a95\u0ac7 \u0aaa\u0acb\u0ab2\u0ac0\u0ab8\u0ac0 \u0aa5\u0ab6\u0ac7."
  },
  {
    "category": "SCHOOL BUS\n\u0ab9\u0a82\u0aae\u0ac7\u0ab6\u0abe NORMAL FULL \u0a9c \u0ab5\u0ac0\u0aae\u0acb \u0a95\u0ab0\u0ab5\u0abe\u0aa8\u0acb \u0ab9\u0acb\u0aaf, NIL DEP \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf\nIMT 23 \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0a9b\u0ac7",
    "choice": 2,
    "company": "SBI",
    "quoteFrom": "Self, Sama",
    "discount": "95.0",
    "declined": "--",
    "inspection": "YES",
    "remarks": ""
  },
  {
    "category": "STAFF BUS\n\u0ab9\u0a82\u0aae\u0ac7\u0ab6\u0abe NORMAL FULL \u0a9c \u0ab5\u0ac0\u0aae\u0acb \u0a95\u0ab0\u0ab5\u0abe\u0aa8\u0acb \u0ab9\u0acb\u0aaf, NIL DEP \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf\nIMT 23 \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0a9b\u0ac7",
    "choice": 1,
    "company": "DIGIT",
    "quoteFrom": "Self, Sama",
    "discount": "95.0",
    "declined": "--",
    "inspection": "YES",
    "remarks": "\u0aab\u0ab0\u0a9c\u0ac0\u0aaf\u0abe\u0aa4 \u0a95\u0a82\u0aaa\u0aa8\u0ac0\u0aa8\u0abe \u0aa8\u0abe\u0aae \u0aaa\u0ab0 \u0a97\u0abe\u0aa1\u0ac0 \u0ab9\u0acb\u0ab5\u0ac0 \u0a9c\u0acb\u0a88\u0a8f,\n\u0a9c\u0acb \u0a95\u0a82\u0aaa\u0aa8\u0ac0 \u0aa8\u0abe \u0aa8\u0abe\u0aae\u0aa8\u0ac0 \u0a97\u0abe\u0aa1\u0ac0 \u0aa8\u0abe \u0ab9\u0acb\u0aaf \u0aa4\u0acb Notorized Agreement, \u0a95\u0acb\u0aa8\u0acd\u0a9f\u0acd\u0ab0\u0abe\u0a95\u0acd\u0a9f \u0a95\u0acb\u0aaa\u0ac0 \u0a85\u0aa8\u0ac7 \u0aaa\u0ab0\u0aae\u0ac0\u0a9f \u0aab\u0ab0\u0a9c\u0ac0\u0aaf\u0abe\u0aa4 \u0a9c\u0acb\u0ab6\u0ac7. \u0a8f\u0aa8\u0abe \u0ab5\u0a97\u0ab0 \u0ab8\u0acd\u0a9f\u0abe\u0aab \u0aac\u0ab8 \u0aa8\u0ab9\u0abf \u0a97\u0aa3\u0abe\u0aaf. \u0aaa\u0ac7\u0ab8\u0ac7\u0aa8\u0acd\u0a9c\u0ab0 \u0aac\u0ab8 \u0a97\u0aa3\u0abe\u0ab6\u0ac7."
  },
  {
    "category": "STAFF BUS\n\u0ab9\u0a82\u0aae\u0ac7\u0ab6\u0abe NORMAL FULL \u0a9c \u0ab5\u0ac0\u0aae\u0acb \u0a95\u0ab0\u0ab5\u0abe\u0aa8\u0acb \u0ab9\u0acb\u0aaf, NIL DEP \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf\nIMT 23 \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0a9b\u0ac7",
    "choice": 2,
    "company": "TATA",
    "quoteFrom": "Self, Sama",
    "discount": "95.0",
    "declined": "--",
    "inspection": "YES",
    "remarks": ""
  },
  {
    "category": "STAFF BUS\n\u0ab9\u0a82\u0aae\u0ac7\u0ab6\u0abe NORMAL FULL \u0a9c \u0ab5\u0ac0\u0aae\u0acb \u0a95\u0ab0\u0ab5\u0abe\u0aa8\u0acb \u0ab9\u0acb\u0aaf, NIL DEP \u0aa8\u0ab9\u0abf \u0aa5\u0abe\u0aaf\nIMT 23 \u0ab2\u0ac7\u0ab5\u0abe\u0aa8\u0ac1\u0a82 \u0a9b\u0ac7",
    "choice": 2,
    "company": "",
    "quoteFrom": "",
    "discount": "",
    "declined": "",
    "inspection": "",
    "remarks": ""
  },
  {
    "category": "PASSENGER BUS (ROUTE BUS / TRAVEL BUS)\nABOVE 20 SEATER\nNORMAL & NIL DEP \n(\u0ab8\u0acd\u0a95\u0ac2\u0ab2 \u0aac\u0ab8 \u0a85\u0aa8\u0ac7 \u0ab8\u0acd\u0a9f\u0abe\u0aab \u0aac\u0ab8 \u0ab8\u0abf\u0ab5\u0abe\u0aaf\u0aa8\u0ac0 \u0aac\u0aa7\u0ac0 \u0aac\u0ab8 PASSENGER BUS \u0aae\u0abe\u0a82 \u0a97\u0aa3\u0abe\u0aaf)",
    "choice": 1,
    "company": "System mathi quotation kadhavvu.\nGovt Company ma Quotation ave to puru premium levu",
    "quoteFrom": "",
    "discount": "",
    "declined": "",
    "inspection": "YES",
    "remarks": ""
  },
  {
    "category": "AMBULANCE",
    "choice": 1,
    "company": "Sama mathi quotation kadhavvu ane Pura Premium ma 1000 rs plus karva.",
    "quoteFrom": "",
    "discount": "",
    "declined": "",
    "inspection": "",
    "remarks": ""
  }
];

export interface RTOCodeItem {
  code: string;
  name: string;
  srNo: number;
}

export const RTO_LIST: RTOCodeItem[] = [
  {
    "code": "GJ-01",
    "name": "RTO Ahmedabad",
    "srNo": 1
  },
  {
    "code": "GJ-02",
    "name": "RTO Mehsana",
    "srNo": 2
  },
  {
    "code": "GJ-03",
    "name": "RTO Rajkot",
    "srNo": 3
  },
  {
    "code": "GJ-04",
    "name": "RTO Bhavnagar",
    "srNo": 4
  },
  {
    "code": "GJ-05",
    "name": "RTO Surat",
    "srNo": 5
  },
  {
    "code": "GJ-06",
    "name": "RTO Vadodra",
    "srNo": 6
  },
  {
    "code": "GJ-07",
    "name": "RTO Nadiad",
    "srNo": 7
  },
  {
    "code": "GJ-08",
    "name": "RTO Palanpur",
    "srNo": 8
  },
  {
    "code": "GJ-09",
    "name": "RTO Himmatnagar",
    "srNo": 9
  },
  {
    "code": "GJ-10",
    "name": "RTO Jamnagar",
    "srNo": 10
  },
  {
    "code": "GJ-11",
    "name": "RTO Junagadh",
    "srNo": 11
  },
  {
    "code": "GJ-12",
    "name": "RTO Bhuj",
    "srNo": 12
  },
  {
    "code": "GJ-13",
    "name": "ARTO Surendranagar",
    "srNo": 13
  },
  {
    "code": "GJ-14",
    "name": "ARTO Amreli",
    "srNo": 14
  },
  {
    "code": "GJ-15",
    "name": "RTO Valsad",
    "srNo": 15
  },
  {
    "code": "GJ-16",
    "name": "ARTO Bharuch",
    "srNo": 16
  },
  {
    "code": "GJ-17",
    "name": "RTO Godhra",
    "srNo": 17
  },
  {
    "code": "GJ-18",
    "name": "ARTO Gandhinagar",
    "srNo": 18
  },
  {
    "code": "GJ-19",
    "name": "ARTO Bardoli",
    "srNo": 19
  },
  {
    "code": "GJ-20",
    "name": "ARTO Dahod",
    "srNo": 20
  },
  {
    "code": "GJ-21",
    "name": "ARTO Navsari",
    "srNo": 21
  },
  {
    "code": "GJ-22",
    "name": "ARTO Rajpipla",
    "srNo": 22
  },
  {
    "code": "GJ-23",
    "name": "ARTO Anand",
    "srNo": 23
  },
  {
    "code": "GJ\u201324",
    "name": "ARTO Patan",
    "srNo": 24
  },
  {
    "code": "GJ-25",
    "name": "ARTO Porbander",
    "srNo": 25
  },
  {
    "code": "GJ-26",
    "name": "ARTO Vyara",
    "srNo": 26
  },
  {
    "code": "GJ-27",
    "name": "ARTO Ahmedabad EAST",
    "srNo": 27
  },
  {
    "code": "GJ-28",
    "name": "ARTO Surat (Pal)",
    "srNo": 28
  },
  {
    "code": "GJ-29",
    "name": "ARTO Vadodara (Darjipura)",
    "srNo": 29
  },
  {
    "code": "GJ-30",
    "name": "ARTO Ahva-Dang",
    "srNo": 30
  },
  {
    "code": "GJ-31",
    "name": "ARTO Modasa (Arvalli)",
    "srNo": 31
  },
  {
    "code": "GJ-32",
    "name": "ARTO Veraval (Gir-Somnath)",
    "srNo": 32
  },
  {
    "code": "GJ-33",
    "name": "ARTO Botad",
    "srNo": 33
  },
  {
    "code": "GJ-34",
    "name": "ARTO Chhota Udepur (C.U)",
    "srNo": 34
  },
  {
    "code": "GJ-35",
    "name": "ARTO Lunawada (Mahisagar)",
    "srNo": 35
  },
  {
    "code": "GJ-36",
    "name": "ARTO Morbi",
    "srNo": 36
  },
  {
    "code": "GJ-37",
    "name": "ARTO Khambhaliya (D.B. Dwarka)",
    "srNo": 37
  },
  {
    "code": "GJ-38",
    "name": "ARTO Bavla (Ahmedabad)",
    "srNo": 38
  },
  {
    "code": "GJ-39",
    "name": "ARTO Anjar (Kachchh)",
    "srNo": 39
  },
  {
    "code": "GJ-40",
    "name": "ARTO Tharad",
    "srNo": 40
  }
];

export interface PolicyLinkItem {
  company: string;
  link1: string;
  link2: string;
  note: string;
}

export const POLICY_DOWNLOAD_LINKS: PolicyLinkItem[] = [
  {
    "company": "Vahan - RC Status",
    "link1": "https://vahan.parivahan.gov.in/nrservices/faces/user/citizen/citizenlogin.xhl",
    "link2": "",
    "note": ""
  },
  {
    "company": "HDFC ERGO",
    "link1": "https://accounts.digilocker.gov.in/v3/4bf2c6290e740eb1bf0e95ca9dfda27a69c820d45c3d05d2f070bee05561291c--en",
    "link2": "https://www.hdfcergo.com/dashboard/auth/login/?ru=L3BvbGljeS9wb2xpY3ktc2VsZWN0aW9uP2FjdGlvbj1lbWFpbFBvbGljeUNvcHk%253D&fromLogout=true",
    "note": ""
  },
  {
    "company": "Tata",
    "link1": "https://www.tataaig.com/buy-online/motor-insurance/car-insurance?ef_id=:G:s&s_kwcid=AL!371!3!!b!!o!!www.tataaig.com&gclsrc=3p.ds&&u_source=Display_Bing&u_medium=PerformanceMax_Bing&u_campaign={4W_Pmax_CustomAudience_Bing}-www.tataaig.com-662730142-1246847503259524-kwd-2329727700647568:aud-820219455:loc-90&u_content=&msclkid=58f4620fd4d81f74e4e405fee9b3dffc",
    "link2": "Whatsapp",
    "note": ""
  },
  {
    "company": "Shriram",
    "link1": "https://www.shriramgi.com/download-policy",
    "link2": "",
    "note": ""
  },
  {
    "company": "Reliance / Indusind",
    "link1": "Print your Insurance Policy Online",
    "link2": "",
    "note": ""
  },
  {
    "company": "SBI",
    "link1": "https://accounts.digilocker.gov.in/v3/4bf2c6290e740eb1bf0e95ca9dfda27a69c820d45c3d05d2f070bee05561291c--en",
    "link2": "https://www.sbigeneral.in/policyprint/motor",
    "note": ""
  },
  {
    "company": "Chola",
    "link1": "https://epolicy.cholainsurance.com/epolicy/logon/frmeportalhome.aspx",
    "link2": "ID: GIRAHM38",
    "note": "Torque@75"
  },
  {
    "company": "Magma",
    "link1": "https://accounts.digilocker.gov.in/v3/4bf2c6290e740eb1bf0e95ca9dfda27a69c820d45c3d05d2f070bee05561291c--en",
    "link2": "",
    "note": ""
  },
  {
    "company": "GoDigit",
    "link1": "https://accounts.digilocker.gov.in/v3/4bf2c6290e740eb1bf0e95ca9dfda27a69c820d45c3d05d2f070bee05561291c--en",
    "link2": "https://www.godigit.com/login",
    "note": ""
  },
  {
    "company": "Royal",
    "link1": "https://accounts.digilocker.gov.in/v3/4bf2c6290e740eb1bf0e95ca9dfda27a69c820d45c3d05d2f070bee05561291c--en",
    "link2": "https://www.royalsundaram.in/VConnect/",
    "note": ""
  },
  {
    "company": "IFFCO",
    "link1": "https://accounts.digilocker.gov.in/v3/4bf2c6290e740eb1bf0e95ca9dfda27a69c820d45c3d05d2f070bee05561291c--en",
    "link2": "",
    "note": ""
  },
  {
    "company": "Liberty",
    "link1": "https://accounts.digilocker.gov.in/v3/4bf2c6290e740eb1bf0e95ca9dfda27a69c820d45c3d05d2f070bee05561291c--en",
    "link2": "",
    "note": ""
  },
  {
    "company": "ICICI",
    "link1": "https://accounts.digilocker.gov.in/v3/4bf2c6290e740eb1bf0e95ca9dfda27a69c820d45c3d05d2f070bee05561291c--en",
    "link2": "",
    "note": ""
  },
  {
    "company": "Bajaj",
    "link1": "Whatsapp - 7507245858",
    "link2": "From Company",
    "note": ""
  },
  {
    "company": "Universal",
    "link1": "https://www.universalsompo.com/download-policy/",
    "link2": "",
    "note": ""
  },
  {
    "company": "MARUTI SUZUKI BROKER",
    "link1": "https://www.marutisuzukiinsurance.com",
    "link2": "",
    "note": ""
  },
  {
    "company": "Zurich Kotak",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "Future",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "Zuno",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "National, United, New India, Oriental",
    "link1": "Policy download nahi thai. Ins company mathi pan nahi mangavi shakai. Customer pase thi j mangavvi padse.",
    "link2": "",
    "note": ""
  },
  {
    "company": "Documents",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "Common",
    "link1": "RC Book, PYP, Quotation",
    "link2": "",
    "note": ""
  },
  {
    "company": "Individual KYC",
    "link1": "Adhar Card, PAN Card",
    "link2": "",
    "note": ""
  },
  {
    "company": "Proprietorship KYC",
    "link1": "Proprietor's Pan Card, GST",
    "link2": "",
    "note": ""
  },
  {
    "company": "Partnership Firm KYC",
    "link1": "Partnership Firm's Pan Card, GST",
    "link2": "",
    "note": ""
  },
  {
    "company": "Private Ltd Company KYC",
    "link1": "Company's Pan Card, GST",
    "link2": "",
    "note": ""
  },
  {
    "company": "Vehicle photo not required FOR BODY TYPE CONFIRMATION",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "1. 2W",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "2. \u20603W PCV",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "4. \u2060TAXI",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "5. \u2060TRACTOR / LOADER",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "6. \u2060MISC D",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "7. \u2060LMV",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "8. \u2060SCHOOL BUS",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "9. \u2060PASSENGER BUS",
    "link1": "",
    "link2": "",
    "note": ""
  },
  {
    "company": "10. \u2060STAFF BUS",
    "link1": "",
    "link2": "",
    "note": ""
  }
];

export const LMV_ADDON_DICTIONARY = [
  { addon: 'Nil Dep (Zero Depreciation)', shortForm: 'ZD', pb: 'Zero Depreciation', tata: 'Depreciation Reimbursement', digit: 'Parts Depreciation Protect', sbi: 'Depreciation Reimbursement', icici: 'Zero Depreciation', chola: 'Waiver of reduction in Depreciation', zuno: 'Depreciation Protect', shriram: 'Nil Depreciation Cover', iffco: 'Depreciation Protect', bajaj: 'Depreciation Shield', magma: 'Zero Depreciation', hdfc: 'Zero Depreciation', reliance: 'Same' },
  { addon: 'Consumables', shortForm: 'CM', pb: 'Consumables', tata: 'Consumable expenses', digit: 'Consumables', sbi: 'Consumable', icici: 'Same', chola: 'Same', zuno: 'Consumable Expenses Protect', shriram: 'Consumables', iffco: 'Consumables', bajaj: 'Consumables', magma: 'Consumables', hdfc: 'Cost of Consumable Items', reliance: 'Same' },
  { addon: 'Engine Protect', shortForm: 'EP', pb: 'Engine Protection Cover', tata: 'Engine Secure', digit: 'Engine and Gear Box Protect', sbi: 'Engine Protect', icici: 'Engine Protect Plus', chola: 'Hydrostatic Lock Cover', zuno: 'Engine Protect', shriram: 'Engine Protect', iffco: 'Engine Protect', bajaj: 'Engine Protector', magma: 'Engine Protect', hdfc: 'Engine and Gear box Protection', reliance: 'Same / Aggravation' },
  { addon: 'Return to Invoice', shortForm: 'RTI', pb: 'Invoice Price Cover', tata: 'Return to Invoice', digit: 'Return to Invoice', sbi: 'Return to Invoice', icici: 'Return to Invoice', chola: 'Return to Invoice', zuno: 'Invoice Price Cover', shriram: 'RTI', iffco: 'RTI', bajaj: 'Invoice Care', magma: 'Return to Invoice', hdfc: 'Emergency Assistance', reliance: 'RTI' },
  { addon: 'Key & Lock Replacement', shortForm: 'KP', pb: 'Key Replacement', tata: 'Key Replacement', digit: 'Key & Lock Protect', sbi: 'Key Protect', icici: 'Key Protect', chola: 'Key Replacement', zuno: 'Key And Locks Protect', shriram: 'Key Cover', iffco: 'Key Cover', bajaj: 'Key & Lock', magma: 'Key Replacement', hdfc: 'Key Protect', reliance: 'Key Protect' },
  { addon: 'Road Side Assistance', shortForm: 'RSA', pb: 'Road Side Assistance', tata: 'RSA', digit: 'Breakdown Assistance', sbi: 'RSA', icici: 'IL Smart Assist - Pro', chola: 'RSA', zuno: 'Road Side Assistance', shriram: 'RSA', iffco: 'RSA', bajaj: 'RSA', magma: 'RSA', hdfc: 'Emergency Assistance Cover', reliance: 'RSA' },
];

export const SPECIAL_OPERATIONAL_RULES = [
  {
    title: 'Outside Morbi Discount Rule',
    gujarati: 'મોરબી બહાર ની ગાડી માં 1000 રૂ. ઓછા લઇ શકશો (LGV, MGV, HGV, TAXI માં જ. 2W, LMV માં નહિ).',
    detail: 'Morbi Pin codes: Morbi City 363641, 363642, Wankaner 363621, Halvad 363630, Maliya Miyana 363670, Tankara 363650. Outside these pin codes, ₹1,000 discount allowed.',
    type: 'discount'
  },
  {
    title: 'Multiple Vehicles Discount Rule',
    gujarati: 'મોરબી બહારની 2 ગાડી એક સાથે કરાવે તો પણ પ્રતિ ગાડી 1000 રૂ. ઓછા કરી શકાશે. મોરબી ની 2 ગાડી એક સાથે કરાવે તો રેટ કરતા 500-500 ઓછા લઇ શકાશે (2W, LMV સિવાય).',
    detail: 'Outside Morbi: ₹1000 off per vehicle. Inside Morbi: ₹500 off per vehicle when 2 vehicles insured together.',
    type: 'discount'
  },
  {
    title: 'Credit / Cheque Policy Mandatory Deposit',
    gujarati: 'બાકી માં જે પોલીસી કરવાની હોય અથવા Customer Cheque ઉપર પોલીસી કરવાની હોય તો Minimum 5,000 ડિપોઝીટ ફરજીયાત લેવાની રહેશે. રેટ થી ઓછા કરી શકાશે નહિ.',
    detail: 'No discounts apply to credit or cheque cases. Minimum ₹5,000 deposit compulsory.',
    type: 'warning'
  },
  {
    title: 'Unpaid / Part-Payment GCV TP Surcharge',
    gujarati: 'પૂરું અથવા પાર્ટ પેમેન્ટ બાકી રાખી ને GCV TP Ins કરવો હોય તો રેટ કરતા 1000 રૂ. પ્લસ લેવાના.',
    detail: 'Add ₹1,000 extra on GCV TP if customer is making part-payment or taking credit.',
    type: 'warning'
  },
  {
    title: 'Hazardous Tankers Rule',
    gujarati: 'પેટ્રોલ / ડીઝલ / ગેસ / કેમિકલ ટેન્કર આવે એટલે સામાન્ય ગાઈડ લાગુ પડશે નહિ. ફક્ત નીચે આપેલી કંપનીમાંથી જ થશે: ICICI, GO DIGIT, ROYAL SUNDARAM, FUTURE GENERALI, SHRIRAM.',
    detail: 'Allowed Tanker Insurers: ICICI, Go Digit (20k-43k), Royal (12k-40k), Future Generali, Shriram (7k-55k).',
    type: 'restriction'
  },
  {
    title: 'Vehicles Older than 15 Years',
    gujarati: '15 વર્ષ ઉપરની કોઈ પણ ગાડી આવે એટલે સામાન્ય નિયમ લાગુ પડશે નહિ. ફક્ત: Shriram (0-55k GVW upto 20 yrs), Universal Sompo (3.5k-55k GVW upto 24 yrs), Royal (12k-40k GVW upto 20 yrs), Go Digit (12k-55k GVW upto 20 yrs), ICICI, SBI (upto 20 yrs), Reliance (>40k).',
    detail: 'Strict company limits apply for commercial vehicles >15 years.',
    type: 'restriction'
  },
  {
    title: 'Water & Milk Tankers',
    gujarati: 'Water, Milk હશે તો LIBERTY અને CHOLA કંપનીમાં નહિ થાય. તેના સિવાયની કંપનીમાં Quotation Guide મુજબ ક્વોટેશન આપવું.',
    detail: 'Liberty & Chola decline water/milk tankers.',
    type: 'restriction'
  },
  {
    title: 'LMV PolicyBazaar Activity Points Rule',
    gujarati: 'LMV માં PB Activity Points 100 થી ઓછા હોય તો Total Premium થી 1000 રૂ. વધારે લેવા. LMV Offline માં Net OD Premium 4000 થી ઓછું હોય તો 1000 રૂ. વધારે લેવા.',
    detail: 'Charge +₹1,000 if PB points < 100 or Net OD < ₹4,000.',
    type: 'warning'
  }
];

export interface RecommenderInput {
  vehicleType: 'GCV' | 'PCV' | 'LMV' | '3W' | 'TRACTOR' | 'BIKE';
  gvwBracket?: string;
  exactGvwKg?: number;
  policyType: 'ALL' | 'NORMAL' | 'NIL_DEP' | 'TP';
  make?: string;
  isTanker?: boolean;
  isWaterMilk?: boolean;
  ageYears?: number;
  rtoCode?: string;
  isOutsideMorbi?: boolean;
}

export interface RecommendedInsurer {
  rank: number;
  isTopPick: boolean;
  company: string;
  groupCode: string;
  discount: string;
  inspection: string;
  paCover: string;
  quoteFrom: string;
  modelAndRto: string;
  remarks: string;
  suitabilityTag: string;
  warningAlert?: string;
}

export interface RecommendationOutput {
  bracketUsed: string;
  topPick: RecommendedInsurer | null;
  alternatives: RecommendedInsurer[];
  activeRules: typeof SPECIAL_OPERATIONAL_RULES;
  warnings: string[];
}

export function recommendBestInsurers(input: RecommenderInput): RecommendationOutput {
  const warnings: string[] = [];
  let bracketId = input.gvwBracket || '0-2500';

  if (input.exactGvwKg !== undefined && input.exactGvwKg > 0) {
    const kg = input.exactGvwKg;
    const matched = GVW_BRACKETS.find(b => kg >= b.minKg && kg <= b.maxKg);
    if (matched) {
      bracketId = matched.id;
    } else if (kg > 50000) {
      bracketId = '50000+';
    }
  }

  // Check special cases
  if (input.isTanker) {
    warnings.push('HAZARDOUS TANKER: Standard GCV rules overridden. Only ICICI, Go Digit, Royal, Future Generali, and Shriram are permitted.');
  }

  if (input.isWaterMilk) {
    warnings.push('WATER/MILK TANKER: CHOLA & LIBERTY are declined. Use Shriram, SBI, Sompo, or ICICI.');
  }

  if (input.ageYears && input.ageYears > 15) {
    warnings.push(`VEHICLE AGE ${input.ageYears} YRS (>15 Years): Only Shriram (upto 20 yrs), Universal Sompo (upto 24 yrs), Royal (upto 20 yrs), Go Digit, ICICI, SBI permitted.`);
  }

  if (input.make && input.make.toUpperCase().includes('BHARATBENZ')) {
    warnings.push('BHARATBENZ MAKE: Shriram and SBI decline BharatBenz. Best choices: Chola, Royal, Go Digit, Universal Sompo, Govt Companies.');
  }

  const makeUpper = (input.make || '').toUpperCase();

  // Filter GCV rules
  let matchingEntries = GCV_RULES.filter(item => {
    if (item.gvw !== bracketId) return false;
    if (input.policyType === 'NORMAL' && item.policyType === 'NIL_DEP') return false;
    if (input.policyType === 'NIL_DEP' && item.policyType === 'NORMAL') return false;
    return true;
  });

  // Sort by choice rank
  matchingEntries.sort((a, b) => a.choice - b.choice);

  const list: RecommendedInsurer[] = matchingEntries.map((item, idx) => {
    let warningAlert: string | undefined = undefined;
    let suitabilityTag = idx === 0 ? '🏆 1st Preference (Best Suitable)' : idx === 1 ? '🥈 2nd Preference' : idx === 2 ? '🥉 3rd Preference' : `Choice #${item.choice}`;

    if (makeUpper.includes('BHARATBENZ') && (item.company.toUpperCase().includes('SHRIRAM') || item.company.toUpperCase().includes('SBI') || item.modelAndRto.toUpperCase().includes('BHARATBENZ DECLINED'))) {
      warningAlert = 'BharatBenz is declined in this company!';
      suitabilityTag = '⚠️ Not Recommended (Declined)';
    }

    if (makeUpper.includes('EICHER') && item.modelAndRto.toUpperCase().includes('EICHER DECLINED')) {
      warningAlert = 'Eicher make is declined in this company!';
      suitabilityTag = '⚠️ Not Recommended (Declined)';
    }

    return {
      rank: item.choice,
      isTopPick: idx === 0 && !warningAlert,
      company: item.company,
      groupCode: item.groupCode,
      discount: item.discount,
      inspection: item.inspection,
      paCover: item.paCover ? `₹${item.paCover}` : 'Standard',
      quoteFrom: item.quoteFrom,
      modelAndRto: item.modelAndRto,
      remarks: item.remarks,
      suitabilityTag,
      warningAlert,
    };
  });

  // Pick the top pick that does not have a warningAlert
  const topPick = list.find(item => !item.warningAlert) || list[0] || null;
  const alternatives = list.filter(item => item !== topPick);

  // Relevant active rules
  const activeRules = SPECIAL_OPERATIONAL_RULES.filter(r => {
    if (input.isTanker && r.title.includes('Tanker')) return true;
    if (input.ageYears && input.ageYears > 15 && r.title.includes('15 Years')) return true;
    if (input.isWaterMilk && r.title.includes('Water')) return true;
    if (r.title.includes('Morbi') || r.title.includes('Deposit')) return true;
    return false;
  });

  return {
    bracketUsed: bracketId,
    topPick,
    alternatives,
    activeRules,
    warnings,
  };
}
