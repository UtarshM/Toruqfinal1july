import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const responses = [
  'પૈસાનો વેંત નથી',
  'ગાડી વેચી નાખી. નવા ઓનરનો કોન્ટેક્ટ નથી થયો',
  'રોંગ નંબર',
  'બંધ નંબર',
  'એજન્ટ નંબર',
  'ફોન લાગે છે પણ રિસિવ નથી કરતા',
  'ગાડી પડતર છે',
  'મોંઘુ પડ્યું અને ANGEL ના રેટમાં પણ ન માન્યા',
  'સમયસર કોલ ના કર્યો એટલે બીજા પાસે કરાવી લીધો',
  'સમયસર ક્વોટેશન ના આપ્યું એટલે બીજા પાસે કરાવી લીધો',
  'એને જે કંપની માં કરવો હતો એમાં આપણાથી ના થયો',
  'એના એજન્ટ પાસે જ કરાવવો છે એવી જીદ છે',
  'શોરૂમમાં કરાવવો છે / કરાવી લીધો',
  'આપણા ઉપર વિશ્વાસ ના આવ્યો એટલે ના કરાવ્યો',
  'વાત જ કરવા તૈયાર નથી. ફોન કાપી નાખે છે',
  'હવે મને ફોન ના કરતા એવું કીધેલ છે',
  'છેલ્લે સુધી હા માં હા કરી પછી બીજે કરાવી લીધો. કારણ ના કીધું',
  'એને સાવ ઓછા માં કરવો હતો એટલે આપણે ના કર્યો',
  'બાકી માં કરવો હતો એટલે મેળ ના પડ્યો',
  'ગયા વર્ષે ફક્ત નામ ટ્રાન્સફર માટે વીમો કરાવ્યો હતો',
  'આપણા થી અપસેટ છે એટલે બીજા પાસે કરાવી લીધો',
  'પહેલી વાર કોલ કર્યો ત્યારે જ એમ કીધું કે વીમો ભરાઈ ગયો છે',
  'હજી ફોલોઅપ ચાલુ છે. કરાવે એવા ચાન્સ છે',
  'ચોખી ના જ પાડે છે વીમો ભરવો નથી',
  'એને ઘરનો કોડ છે',
  'RENEWAL લીસ્ટ મા છે',
  'SCHOOL BUS છે',
  'TAKEN LIST મા છે',
  'મોરબી જિલ્લા બહારની ગાડી છે',
  'TORQUE માં બીજા સ્ટાફ પાસે કરાવ્યો',
  'લોન / હપ્તા ન ભરવાને કારણે ફાઈનાન્સ વાળા ગાડી લઇ ગયા',
  'ગાડી સ્ક્રેપમાં આપી દીધી / રજીસ્ટ્રેશન નંબર કેન્સલ થઇ ગયા',
  'વીમા ની expiry date અલગ છે'
];

const followupResponses = [
  'ફોન લાગે છે પણ રિસિવ નથી કરતા',
  'હજી ફોલોઅપ ચાલુ છે. કરાવે એવા ચાન્સ છે',
  'પૈસાનો વેંત નથી',
  'એજન્ટ નંબર'
];

async function main() {
  console.log('Seeding predefined responses...');
  
  for (let i = 0; i < responses.length; i++) {
    const text = responses[i];
    const requiresFollowUp = followupResponses.includes(text) || text.includes('Quotation') || text.includes('Interested');
    
    await prisma.predefinedResponse.upsert({
      where: { text },
      update: {
        orderIndex: i,
        requiresFollowUp,
      },
      create: {
        text,
        orderIndex: i,
        requiresFollowUp,
      }
    });
  }
  
  console.log('Responses seeded successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
