/**
 * Rate Calculator Message and Brand Utilities
 * Formats WhatsApp quote messages in Gujarati with short brand names
 */

/**
 * Extracts clean, recognizable short insurance brand name
 * e.g., "CHOLA 2501-3500 GVW NIL DEP AND NORMAL" -> "Chola"
 *       "SHRIRAM 0-2800 GVW NIL DEP AND NORMAL"   -> "Shriram"
 *       "TATA 2501-3500 GVW NIL DEP AND NORMAL"     -> "Tata"
 *       "SBI 0-2000 GVW NIL DEP AND NORMAL"        -> "SBI"
 *       "GO DIGIT 20000-43000 GVW ABOVE 5 YEAR"     -> "Go Digit"
 *       "ICICI 3500 -7500 GVW NIL DEP AND NORMAL"   -> "ICICI"
 */
export function getShortCompanyName(rawName: string): string {
  if (!rawName) return 'Insurance';
  const trimmed = rawName.trim();
  const upper = trimmed.toUpperCase();

  // Known insurance company brand prefixes
  if (upper.startsWith('CHOLA')) return 'Chola';
  if (upper.startsWith('SHRIRAM')) return 'Shriram';
  if (upper.startsWith('TATA')) return 'Tata';
  if (upper.startsWith('SBI')) return 'SBI';
  if (upper.startsWith('GO DIGIT') || upper.startsWith('DIGIT')) return 'Go Digit';
  if (upper.startsWith('ICICI')) return 'ICICI';
  if (upper.startsWith('HDFC')) return 'HDFC';
  if (upper.startsWith('MAGMA')) return 'Magma';
  if (upper.startsWith('RELIANCE')) return 'Reliance';
  if (upper.startsWith('UNIVERSAL SOMPO') || upper.startsWith('SOMPO')) return 'Universal Sompo';
  if (upper.startsWith('UNITED & IFFCO') || upper.startsWith('IFFCO') || upper.startsWith('UNITED')) return 'United & IFFCO';
  if (upper.startsWith('FUTURE')) return 'Future Generali';
  if (upper.startsWith('LIBERTY')) return 'Liberty';
  if (upper.startsWith('ROYAL')) return 'Royal Sundaram';
  if (upper.startsWith('BAJAJ')) return 'Bajaj';
  if (upper.startsWith('KOTAK')) return 'Kotak';
  if (upper.startsWith('NEW INDIA')) return 'New India';
  if (upper.startsWith('NATIONAL')) return 'National Insurance';
  if (upper.startsWith('ORIENTAL')) return 'Oriental';
  if (upper.startsWith('ZUNO') || upper.startsWith('EDELWEISS')) return 'Zuno';
  if (upper.startsWith('TAXI')) return 'Taxi';
  if (upper.startsWith('SCHOOL BUS')) return 'School Bus';

  // Fallback: strip numbers, GVW, and underwriting keywords
  const cleaned = trimmed
    .replace(/\s*\d+.*$/i, '')
    .replace(/\s*(GVW|NIL DEP|NORMAL|YEAR|ABOVE|BELOW).*$/i, '')
    .trim();

  return cleaned || trimmed.split(' ')[0] || trimmed;
}

/**
 * Formats Gujarati quote message according to Torque standard:
 *
 * Chola Company નો વીમો આવશે.
 *
 * ₹20,000 ની પોલિસી આવશે, જેમાં હું તમને ₹5,000 કેશબેક (ડિસ્કાઉન્ટ) કરી આપીશ.
 *
 * એટલે તમારે માત્ર ₹15,000 જ આપવાના રહેશે.
 */
export function formatRateCalculatorQuoteMessage(params: {
  companyName: string;
  totalPremium: number | string;
  benefit: number | string;
  rate: number | string;
  remarks?: string;
}): string {
  const shortComp = getShortCompanyName(params.companyName);
  const cleanBrand = shortComp.replace(/\s+Company$/i, '').trim();
  const totalNum = Math.round(Number(params.totalPremium) || 0);
  const benefitNum = Math.round(Number(params.benefit) || 0);
  const rateNum = Math.round(Number(params.rate) || 0);

  const totalFormatted = totalNum.toLocaleString('en-IN');
  const benefitFormatted = benefitNum.toLocaleString('en-IN');
  const rateFormatted = rateNum.toLocaleString('en-IN');

  const paragraphs: string[] = [];

  // Paragraph 1: Company line
  paragraphs.push(`${cleanBrand} Company નો વીમો આવશે.`);

  // Paragraph 2: Policy amount & cashback/discount
  if (benefitNum > 0) {
    paragraphs.push(`₹${totalFormatted} ની પોલિસી આવશે, જેમાં હું તમને ₹${benefitFormatted} કેશબેક (ડિસ્કાઉન્ટ) કરી આપીશ.`);
  } else {
    paragraphs.push(`₹${totalFormatted} ની પોલિસી આવશે.`);
  }

  // Paragraph 3: Final payable by customer
  paragraphs.push(`એટલે તમારે માત્ર ₹${rateFormatted} જ આપવાના રહેશે.`);

  // Internal broker notes/remarks are excluded from customer-facing quote messages

  return paragraphs.join('\n\n');
}
