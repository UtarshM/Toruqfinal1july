export interface ConfirmationData {
  customerName?: string;
  vehicleNo?: string;
  policyType?: string;
  insCompany?: string;
  cfExpiryDate?: string;
  gujaratPermitExpiryDate?: string;
  nationalPermitExpiryDate?: string;
  pucExpiryDate?: string;
  pypCompany?: string;
  bodyTypeRc?: string;
  bodyTypeActual?: string;
  bankName?: string;
  chequeNo?: string;
  chequeDepositDate?: string;
  depositAmount?: string | number;
  discountRs?: string | number;
  totalReturnAmount?: string | number;
  rsFromCustomer?: string | number;
  dueAmount?: string | number;
  dueDate?: string;
}

export type TemplateKey =
  | 'imp_date'
  | 'ncb'
  | 'no_jack'
  | 'no_towing'
  | 'body_type'
  | 'cheque'
  | 'payment_baki';

export interface TemplateDefinition {
  key: TemplateKey;
  title: string;
  gujaratiTitle: string;
  icon: string;
  desc: string;
  generate: (data: ConfirmationData) => string;
}

export function getImpDateConfirmationMsg(d: ConfirmationData): string {
  const name = d.customerName?.trim() || 'Customer Name';
  const veh = d.vehicleNo?.trim() || 'GJ-XX-XXXX';
  const polType = d.policyType?.trim() || 'Comprehenshive / Nil Dep';
  const comp = d.insCompany?.trim() || 'Insurance Company';
  const cfDate = d.cfExpiryDate?.trim() || 'DD/MM/YYYY';
  const gjPermit = d.gujaratPermitExpiryDate?.trim() || 'DD/MM/YYYY';
  const nlPermit = d.nationalPermitExpiryDate?.trim() || 'DD/MM/YYYY';
  const pucDate = d.pucExpiryDate?.trim() || 'DD/MM/YYYY';

  return `IMP Date Confirmation 

*${name}*
 
આપની *${veh}* ગાડીનો *${polType}* વીમો આપ એ *${comp}* માં અમારી પાસે કરાવેલ છે.

આ ગાડીનું પાસિંગ તા *${cfDate}* ના રોજ પૂરું થાય છે / થઈ ગયુ છે.

ગુજરાત પરમિટ *${gjPermit}* ના રોજ પૂરી થાય છે / થઈ ગઈ છે. (If applicable)

નેશનલ પરમિટ *${nlPermit}* ના રોજ પૂરી થાય છે / થઈ ગઈ  છે. (If applicable)

PUC *${pucDate}* ના રોજ પૂરુ થાય છે / થઈ ગઈ  છે.

વીમા ક્લેમ પાસ કરાવવા માટે અકસ્માત સમયે ગાડીમાં પાસિંગ, પરમિટ, PUC ચાલુ હોવું જરૂરી છે.

*For Petrol & CNG Vehicles only* -
CNG કીટ ફિટ કરેલી હોય તો ક્લેમ સમયે CNG ટેસ્ટીંગ સર્ટીફીકેટ પણ ચાલુ હોવું જરૂરી છે સાથે સાથે RC બુકમાં અને વીમા પોલિસીમાં પણ CNG કીટનો ઉલ્લેખ હોવો જરૂરી છે.`;
}

export function getNcbConfirmationMsg(d: ConfirmationData): string {
  const veh = d.vehicleNo?.trim() || 'GJ-XX-XXXX';
  const pypComp = d.pypCompany?.trim() || 'PYP Company Name';

  return `NCB Confirmation 

આપની આ ગાડી *${veh}* ની ગયા વર્ષની *${pypComp}* ની પોલિસીમાં એક પણ ક્લેમ નથી કરાવેલ કે એક વર્ષની અંદર RTO માં નામ ટ્રાન્સફર નથી કરાવેલ તેની તમોએ ખાત્રી આપેલ છે અને તેના આધારે જ કોટેશનમાં મેં NCB (નો ક્લેમ બોનસ) લીધેલ છે. ખોટું NCB લઈને પોલિસી કરવાથી ક્લેમ પાસ થતો નથી તેની આપને જાણ કરવી એ મારી ફરજ છે.`;
}

export function getNoJackCoverConfirmationMsg(_d?: ConfirmationData): string {
  return `No Jack Cover Confirmation 

આ પોલિસીમાં જેક (Jack) નું કવર લીધેલ નથી માટે એક્સિડન્ટ વિના લોડિંગ / અનલોડિંગ વખતે જેકમાં નુકશાન થશે તો વીમામાં કવર થશે નહીં.`;
}

export function getNoTowingConfirmationMsg(_d?: ConfirmationData): string {
  return `No Towing Confirmation 

આ વિમામાં ટોઈંગ કવર (Towing Cover) લીધેલ નથી જેથી અકસ્માત સમયે ગાડીને ગેરેજ સુધી ગ્રાહકે પોતાના ખર્ચે પહોંચાડવાની રહેશે.`;
}

export function getBodyTypeMismatchMsg(d: ConfirmationData): string {
  const rcBody = d.bodyTypeRc?.trim() || 'Body Type as per RC';
  const actualBody = d.bodyTypeActual?.trim() || 'Actual Vehicle Body Type';

  return `Body Type Mismatch 
After Policy done 

આ ગાડીની RC બૂકમાં Body Type *${rcBody}* છે અને ગાડી માં અત્યારે *${actualBody}* Body Type છે.
આવા સંજોગોમાં અકસ્માત સમયે વીમા ક્લેમમાં અને ગાડીના પાસીંગમાં તકલીફ પડે છે માટે RC બૂક માં body type નો સુધારો કરાવી લેજો. Body Type અલગ હોવાને લીધે જો વિમા ક્લેમ રદ્દ થાય તો તેમાં અમારી કોઈ જવાબદારી રહેશે નહીં.`;
}

export function getCustomerChequeMsg(d: ConfirmationData): string {
  const name = d.customerName?.trim() || 'Customer Name';
  const veh = d.vehicleNo?.trim() || 'GJ-XX-XXXX';
  const bank = d.bankName?.trim() || 'Bank Name';
  const chkNo = d.chequeNo?.trim() || 'Cheque No.';
  const depDate = d.chequeDepositDate?.trim() || 'DD/MM/YYYY';
  const depAmt = d.depositAmount !== undefined && d.depositAmount !== '' ? String(d.depositAmount) : '10,000';
  const cbAmt = d.discountRs !== undefined && d.discountRs !== '' ? String(d.discountRs) : '0';
  
  let total = d.totalReturnAmount !== undefined && d.totalReturnAmount !== '' ? String(d.totalReturnAmount) : '';
  if (!total) {
    const numDep = parseFloat(String(depAmt).replace(/,/g, '')) || 0;
    const numCb = parseFloat(String(cbAmt).replace(/,/g, '')) || 0;
    total = String(numDep + numCb);
  }

  return `Customer Cheque 

*Customer Name:* ${name}
*Vehicle Number:* ${veh}

પ્રિય *${name}*

આપના *${veh}* ના વીમાની પોલિસી માટે આપે *${bank}* નો ચેક નંબર *${chkNo}* આપેલ છે.

ચેક આજથી એક અઠવાડિયા પછી એટલે કે તારીખ *${depDate}* ના રોજ બેંકમાં જમા કરવામાં આવશે. ચેક જમા કરાવતા પહેલાં તમને કોઈ મેસેજ કે ફોન કરવામાં આવશે નહીં.

જો ચેક બાઉન્સ થશે તો પોલિસી કેન્સલ થઈ જશે અને આપેલી ₹${depAmt} ની ડિપોઝિટ જપ્ત થઈ જશે.

જો ચેક ક્લિયર થશે તો આપે ચેક ક્લિયર થયાનું બેંક સ્ટેટમેન્ટ pdf અથવા પાસબુકનો ફોટો અમને મોકલવાનો રહેશે.

સ્ટેટમેન્ટ મળ્યાના 24 કલાકમાં આપને નીચે મુજબની રકમ પરત આપવામાં આવશે:

ડિપોઝિટ: ₹${depAmt}
કેશબેક: ₹ ${cbAmt}
કુલ રકમ: ₹ ${total}

આપે ઉપરની તમામ શરતો વાંચી અને સમજી છે તથા તે આપને મંજૂર છે.`;
}

export function getPaymentBakiMsg(d: ConfirmationData): string {
  const totalAmt = d.rsFromCustomer !== undefined && d.rsFromCustomer !== '' ? String(d.rsFromCustomer) : (d.dueAmount ? String(d.dueAmount) : '0');
  const dueAmt = d.dueAmount !== undefined && d.dueAmount !== '' ? String(d.dueAmount) : totalAmt;
  const dueDate = d.dueDate?.trim() || 'DD/MM/YYYY';

  return `Payment Baki 

આ ગાડીનો વીમો રૂ. *${totalAmt}* મા નક્કી કરેલ છે અને રૂ. *${dueAmt}* પેમેન્ટ બાકી રાખેલ છે.

બાકી પેમેન્ટ તારીખ *${dueDate}* સુધીમાં કરાવી આપવાનું નક્કી થયેલ છે. પેમેન્ટ કરતી વખતે નક્કી થયેલ રકમથી કઈ પણ ઓછું નહીં કરવામાં આવે જેની ખાસ નોંધ લેશો.

સમયસર પેમેન્ટ કરી સહકાર આપશો એવી આપને વિનંતી છે.`;
}

export const CONFIRMATION_TEMPLATES: TemplateDefinition[] = [
  {
    key: 'imp_date',
    title: 'IMP Date Confirmation',
    gujaratiTitle: 'પાસિંગ, પરમિટ, PUC તારીખો',
    icon: 'Calendar',
    desc: 'Vehicle passing, permit, and PUC expiry dates confirmation',
    generate: getImpDateConfirmationMsg
  },
  {
    key: 'ncb',
    title: 'NCB Confirmation',
    gujaratiTitle: 'નો ક્લેમ બોનસ (NCB)',
    icon: 'ShieldCheck',
    desc: 'Prior year claim-free warranty and NCB validation warning',
    generate: getNcbConfirmationMsg
  },
  {
    key: 'no_jack',
    title: 'No Jack Cover',
    gujaratiTitle: 'જેક કવર નથી',
    icon: 'Wrench',
    desc: 'Notice that Jack damage during loading/unloading is excluded',
    generate: getNoJackCoverConfirmationMsg
  },
  {
    key: 'no_towing',
    title: 'No Towing Cover',
    gujaratiTitle: 'ટોઈંગ કવર નથી',
    icon: 'Car',
    desc: 'Customer bears own towing cost to garage upon accident',
    generate: getNoTowingConfirmationMsg
  },
  {
    key: 'body_type',
    title: 'Body Type Mismatch',
    gujaratiTitle: 'બોડી ટાઈપ મિસમેચ',
    icon: 'Truck',
    desc: 'Notice regarding discrepancy between RC body and actual vehicle body',
    generate: getBodyTypeMismatchMsg
  },
  {
    key: 'cheque',
    title: 'Customer Cheque',
    gujaratiTitle: 'ચેક પેમેન્ટ & ડિપોઝિટ',
    icon: 'CreditCard',
    desc: 'Cheque deposit date, ₹10,000 bounce forfeiture & cashback return terms',
    generate: getCustomerChequeMsg
  },
  {
    key: 'payment_baki',
    title: 'Payment Baki',
    gujaratiTitle: 'બાકી પેમેન્ટ કન્ફર્મેશન',
    icon: 'Banknote',
    desc: 'Credit policy total amount, pending balance, and firm due date',
    generate: getPaymentBakiMsg
  }
];

export const ALL_TEMPLATE_KEYS: TemplateKey[] = CONFIRMATION_TEMPLATES.map(t => t.key);

export function combineConfirmationMessages(
  selectedKeys: TemplateKey[],
  data: ConfirmationData,
  customOverrides?: Partial<Record<TemplateKey, string>>
): string {
  const orderedKeys = CONFIRMATION_TEMPLATES.map(t => t.key).filter(k => selectedKeys.includes(k));
  if (orderedKeys.length === 0) {
    return 'કૃપા કરીને ઓછામાં ઓછો એક કન્ફર્મેશન વિકલ્પ પસંદ કરો.';
  }

  const name = data.customerName?.trim() || 'Customer Name';
  const veh = data.vehicleNo?.trim() || 'GJ-XX-XXXX';

  const sections = orderedKeys.map((key, idx) => {
    const def = CONFIRMATION_TEMPLATES.find(t => t.key === key)!;
    const custom = customOverrides?.[key];
    const body = custom && custom.trim() !== '' ? custom.trim() : def.generate(data).trim();
    return `*${idx + 1}. ${def.title}*\n${body}`;
  });

  return `🙏 *Customer Policy Approval & Confirmation*\n*Customer:* ${name}\n*Vehicle No:* ${veh}\n\n━━━━━━━━━━━━━━━━━━━━\n\n${sections.join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n')}\n\n━━━━━━━━━━━━━━━━━━━━\n\nકૃપા કરીને ઉપરની તમામ વિગતો વાંચી અને ચકાસીને *"OK / Approved"* રિપ્લાય આપશો. 🙏`;
}
