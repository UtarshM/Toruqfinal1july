/**
 * frontend/src/lib/call-outcomes.ts
 * Master 36 Call Outcomes & Predefined Responses for Torque Auto Advisor.
 * Sourced directly from leads Response.xlsx with Gujarati text, English categorization,
 * and automated follow-up scheduling defaults.
 */

export interface CallOutcomeItem {
  id: string;
  orderIndex: number;
  text: string;
  gujarati: string;
  category: 'Follow Up' | 'Invalid Contact' | 'Vehicle Inactive' | 'Lost to Competitor' | 'Not Interested' | 'No Answer' | 'Rescheduled' | 'Existing Pipeline' | 'Closed Won' | 'Closed Lost' | 'Other';
  requiresFollowUp: boolean;
  followupDays: number;
}

export const MASTER_CALL_OUTCOMES: CallOutcomeItem[] = [
  {
    id: 'resp-1',
    orderIndex: 1,
    text: 'પૈસાનો વેંત નથી (Financial Constraint)',
    gujarati: 'પૈસાનો વેંત નથી.',
    category: 'Follow Up',
    requiresFollowUp: true,
    followupDays: 7
  },
  {
    id: 'resp-2',
    orderIndex: 2,
    text: 'ગાડી વેચી નાખી - નવા ઓનરનો કોન્ટેક્ટ નથી થયો (Vehicle Sold)',
    gujarati: 'ગાડી વેચી નાખી. નવા ઓનરનો કોન્ટેક્ટ નથી થયો.',
    category: 'Vehicle Inactive',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-3',
    orderIndex: 3,
    text: 'રોંગ નંબર (Wrong Number)',
    gujarati: 'રોંગ નંબર',
    category: 'Invalid Contact',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-4',
    orderIndex: 4,
    text: 'બંધ નંબર (Switched Off / Out of Service)',
    gujarati: 'બંધ નંબર',
    category: 'Invalid Contact',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-5',
    orderIndex: 5,
    text: 'એજન્ટ નંબર (Agent Number)',
    gujarati: 'એજન્ટ નંબર',
    category: 'Invalid Contact',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-6',
    orderIndex: 6,
    text: 'ફોન લાગે છે પણ રિસિવ નથી કરતા (Ringing / No Answer)',
    gujarati: 'ફોન લાગે છે પણ રિસિવ નથી કરતા',
    category: 'No Answer',
    requiresFollowUp: true,
    followupDays: 1
  },
  {
    id: 'resp-7',
    orderIndex: 7,
    text: 'ગાડી પડતર છે (Vehicle Not in Use)',
    gujarati: 'ગાડી પડતર છે.',
    category: 'Vehicle Inactive',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-8',
    orderIndex: 8,
    text: 'મોંઘુ પડ્યું અને ANGEL ના રેટમાં પણ ન માન્યા (Price Issue)',
    gujarati: 'મોંઘુ પડ્યું અને ANGEL ના રેટમાં પણ ન માન્યા.',
    category: 'Lost to Competitor',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-9',
    orderIndex: 9,
    text: 'સમયસર કોલ ના કર્યો એટલે બીજા પાસે કરાવી લીધો (Done Elsewhere - Late Call)',
    gujarati: 'સમયસર કોલ ના કર્યો એટલે બીજા પાસે કરાવી લીધો.',
    category: 'Lost to Competitor',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-10',
    orderIndex: 10,
    text: 'સમયસર ક્વોટેશન ના આપ્યું એટલે બીજા પાસે કરાવી લીધો (Done Elsewhere - Late Quote)',
    gujarati: 'સમયસર ક્વોટેશન ના આપ્યું એટલે બીજા પાસે કરાવી લીધો',
    category: 'Lost to Competitor',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-11',
    orderIndex: 11,
    text: 'જે કંપની માં કરવો હતો એમાં આપણાથી ના થયો (Requested Insurer Unavailable)',
    gujarati: 'એને જે કંપની માં કરવો હતો એમાં આપણાથી ના થયો',
    category: 'Lost to Competitor',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-12',
    orderIndex: 12,
    text: 'એના એજન્ટ પાસે જ કરાવવો છે એવી જીદ છે (Prefers Own Agent)',
    gujarati: 'એના એજન્ટ પાસે જ કરાવવો છે એવી જીદ છે.',
    category: 'Lost to Competitor',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-13',
    orderIndex: 13,
    text: 'શોરૂમમાં કરાવવો છે / કરાવી લીધો (Showroom Renewal)',
    gujarati: 'શોરૂમમાં કરાવવો છે / કરાવી લીધો',
    category: 'Lost to Competitor',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-14',
    orderIndex: 14,
    text: 'આપણા ઉપર વિશ્વાસ ના આવ્યો એટલે ના કરાવ્યો (Trust Issue)',
    gujarati: 'આપણા ઉપર વિશ્વાસ ના આવ્યો એટલે ના કરાવ્યો',
    category: 'Not Interested',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-15',
    orderIndex: 15,
    text: 'વાત જ કરવા તૈયાર નથી - ફોન કાપી નાખે છે (Call Disconnected / Refused Talk)',
    gujarati: 'વાત જ કરવા તૈયાર નથી. ફોન કાપી નાખે છે.',
    category: 'Not Interested',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-16',
    orderIndex: 16,
    text: 'હવે મને ફોન ના કરતા એવું કીધેલ છે (Do Not Call)',
    gujarati: 'હવે મને ફોન ના કરતા એવું કીધેલ છે.',
    category: 'Not Interested',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-17',
    orderIndex: 17,
    text: 'છેલ્લે સુધી હા માં હા કરી પછી બીજે કરાવી લીધો (Done Elsewhere - Unstated Reason)',
    gujarati: 'છેલ્લે સુધી હા માં હા કરી પછી બીજે કરાવી લીધો. કારણ ના કીધું',
    category: 'Lost to Competitor',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-18',
    orderIndex: 18,
    text: 'એને સાવ ઓછા માં કરવો હતો એટલે આપણે ના કર્યો (Rate Too Low)',
    gujarati: 'એને સાવ ઓછા માં કરવો હતો એટલે આપણે ના કર્યો',
    category: 'Not Interested',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-19',
    orderIndex: 19,
    text: 'બાકી માં કરવો હતો એટલે મેળ ના પડ્યો (Credit / Due Request)',
    gujarati: 'બાકી માં કરવો હતો એટલે મેળ ના પડ્યો',
    category: 'Not Interested',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-20',
    orderIndex: 20,
    text: 'ગયા વર્ષે ફક્ત નામ ટ્રાન્સફર માટે વીમો કરાવ્યો હતો (Transfer Only Previous Year)',
    gujarati: 'ગયા વર્ષે ફક્ત નામ ટ્રાન્સફર માટે વીમો કરાવ્યો હતો',
    category: 'Not Interested',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-21',
    orderIndex: 21,
    text: 'આપણા થી અપસેટ છે એટલે બીજા પાસે કરાવી લીધો (Upset Customer)',
    gujarati: 'આપણા થી અપસેટ છે એટલે બીજા પાસે કરાવી લીધો',
    category: 'Lost to Competitor',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-22',
    orderIndex: 22,
    text: 'પહેલી વાર કોલ કર્યો ત્યારે જ એમ કીધું કે વીમો ભરાઈ ગયો છે (Already Insured)',
    gujarati: 'પહેલી વાર કોલ કર્યો ત્યારે જ એમ કીધું કે વીમો ભરાઈ ગયો છે',
    category: 'Lost to Competitor',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-23',
    orderIndex: 23,
    text: 'હજી ફોલોઅપ ચાલુ છે - કરાવે એવા ચાન્સ છે (Warm Lead / Chance of Renewal)',
    gujarati: 'હજી ફોલોઅપ ચાલુ છે. કરાવે એવા ચાન્સ છે.',
    category: 'Follow Up',
    requiresFollowUp: true,
    followupDays: 3
  },
  {
    id: 'resp-24',
    orderIndex: 24,
    text: 'ચોખી ના જ પાડે છે વીમો ભરવો નથી (Refused Insurance)',
    gujarati: 'ચોખી ના જ પાડે છે વીમો ભરવો નથી',
    category: 'Not Interested',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-25',
    orderIndex: 25,
    text: 'એને ઘરનો કોડ છે (Direct Agency Code)',
    gujarati: 'એને ઘરનો કોડ છે',
    category: 'Lost to Competitor',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-26',
    orderIndex: 26,
    text: 'RENEWAL લીસ્ટ મા છે (In Renewal List)',
    gujarati: 'RENEWAL લીસ્ટ મા છે',
    category: 'Existing Pipeline',
    requiresFollowUp: true,
    followupDays: 5
  },
  {
    id: 'resp-27',
    orderIndex: 27,
    text: 'SCHOOL BUS છે (School Bus Special)',
    gujarati: 'SCHOOL BUS છે',
    category: 'Other',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-28',
    orderIndex: 28,
    text: 'TAKEN LIST મા છે (In Taken List)',
    gujarati: 'TAKEN LIST મા છે',
    category: 'Existing Pipeline',
    requiresFollowUp: true,
    followupDays: 5
  },
  {
    id: 'resp-29',
    orderIndex: 29,
    text: 'મોરબી જિલ્લા બહારની ગાડી છે એટલે વિશ્વાસ ન આવ્યો (Out of District Vehicle)',
    gujarati: 'મોરબી જિલ્લા બહારની ગાડી છે એટલે વિશ્વાસ ન આવ્યો',
    category: 'Not Interested',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-30',
    orderIndex: 30,
    text: 'TORQUE માં બીજા સ્ટાફ પાસે કરાવ્યો (Done with Other Staff)',
    gujarati: 'TORQUE માં બીજા સ્ટાફ પાસે કરાવ્યો',
    category: 'Existing Pipeline',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-31',
    orderIndex: 31,
    text: 'લોન / હપ્તા ન ભરવાને કારણે ફાઈનાન્સ વાળા ગાડી લઇ ગયા (Repossessed by Finance)',
    gujarati: 'લોન / હપ્તા ન ભરવાને કારણે ફાઈનાન્સ વાળા ગાડી લઇ ગયા.',
    category: 'Vehicle Inactive',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-32',
    orderIndex: 32,
    text: 'ગાડી સ્ક્રેપમાં આપી દીધી / રજીસ્ટ્રેશન કેન્સલ (Scrapped / RC Cancelled)',
    gujarati: 'ગાડી સ્ક્રેપમાં આપી દીધી / રજીસ્ટ્રેશન નંબર કેન્સલ થઇ ગયા.',
    category: 'Vehicle Inactive',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-33',
    orderIndex: 33,
    text: 'વીમા ની expiry date અલગ છે (Expiry Date Different)',
    gujarati: 'વીમા ની expiry date અલગ છે. Exp Date:_________',
    category: 'Rescheduled',
    requiresFollowUp: true,
    followupDays: 14
  },
  {
    id: 'resp-34',
    orderIndex: 34,
    text: 'કોલ બેક / રસ ધરાવે છે (Callback Requested)',
    gujarati: 'કોલ બેક / રસ ધરાવે છે (Callback Requested)',
    category: 'Follow Up',
    requiresFollowUp: true,
    followupDays: 2
  },
  {
    id: 'resp-35',
    orderIndex: 35,
    text: 'પોલિસી ઈશ્યુ થઈ ગઈ / સફળ (Policy Issued / Won)',
    gujarati: 'પોલિસી ઈશ્યુ થઈ ગઈ / સફળ (Policy Issued / Won)',
    category: 'Closed Won',
    requiresFollowUp: false,
    followupDays: 0
  },
  {
    id: 'resp-36',
    orderIndex: 36,
    text: 'વીમો કરાવવા રસ નથી (Closed Lost)',
    gujarati: 'વીમો કરાવવા રસ નથી (Closed Lost)',
    category: 'Closed Lost',
    requiresFollowUp: false,
    followupDays: 0
  }
];

export const CATEGORIES = [
  'All',
  'Follow Up',
  'Invalid Contact',
  'Vehicle Inactive',
  'Lost to Competitor',
  'Not Interested',
  'No Answer',
  'Rescheduled',
  'Existing Pipeline',
  'Closed Won',
  'Closed Lost'
] as const;
