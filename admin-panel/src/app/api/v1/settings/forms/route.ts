import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export interface FormFieldConfig {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file' | 'boolean'
  required: boolean
  enabled: boolean
  placeholder?: string
  options?: string[]
  helpText?: string
  isSystem?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Schemas for all 8 Primary Forms in Torque ERP
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_FORM_SCHEMAS: Record<string, { name: string; description: string; fields: FormFieldConfig[] }> = {
  leads: {
    name: 'Leads Form',
    description: 'Fields used when creating, updating, or capturing customer insurance leads',
    fields: [
      { id: 'customerName', label: 'Customer Full Name', type: 'text', required: true, enabled: true, isSystem: true, placeholder: 'e.g. Ramesh Patel' },
      { id: 'customerMobile', label: 'Primary Contact Mobile', type: 'text', required: true, enabled: true, isSystem: true, placeholder: '10-digit mobile number' },
      { id: 'customerEmail', label: 'Customer Email', type: 'text', required: false, enabled: true, placeholder: 'customer@gmail.com' },
      { id: 'customerCity', label: 'City / Location', type: 'text', required: false, enabled: true, placeholder: 'e.g. Ahmedabad, Surat' },
      { id: 'vehicleNumber', label: 'Vehicle Registration No', type: 'text', required: true, enabled: true, placeholder: 'GJ01AB1234' },
      { id: 'make', label: 'Vehicle Make / Brand', type: 'text', required: true, enabled: true, placeholder: 'e.g. Maruti Suzuki, Hyundai' },
      { id: 'model', label: 'Vehicle Model & Variant', type: 'text', required: true, enabled: true, placeholder: 'e.g. Swift VXI, Creta SX' },
      { id: 'manufacturingYear', label: 'Manufacturing Year', type: 'number', required: false, enabled: true, placeholder: 'YYYY (e.g. 2021)' },
      { id: 'fuelType', label: 'Fuel Type', type: 'select', required: true, enabled: true, options: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'] },
      { id: 'previousPolicyExpiry', label: 'Previous Policy Expiry Date', type: 'date', required: false, enabled: true },
      { id: 'previousInsurer', label: 'Previous Insurance Company', type: 'select', required: false, enabled: true, options: ['HDFC ERGO', 'ICICI Lombard', 'Tata AIG', 'Bajaj Allianz', 'New India', 'National Insurance', 'Digit', 'Other'] },
      { id: 'policyTypeRequired', label: 'Insurance Cover Required', type: 'select', required: true, enabled: true, options: ['Comprehensive', 'Zero Depreciation (Bumper to Bumper)', 'Third Party Only', 'Standalone OD'] },
      { id: 'estimatedPremium', label: 'Estimated Premium (₹)', type: 'number', required: false, enabled: true, placeholder: '₹' },
      { id: 'leadSource', label: 'Lead Source', type: 'select', required: false, enabled: true, options: ['Direct Walk-in', 'Dealer Reference', 'Telecalling', 'WhatsApp Campaign', 'Website Inquiry', 'Agent Referral'] },
      { id: 'remarks', label: 'Notes & Executive Remarks', type: 'textarea', required: false, enabled: true, placeholder: 'Add any specific customer requirements...' }
    ]
  },
  quotations: {
    name: 'Quotations Form',
    description: 'Fields used when generating and dispatching comparative insurance quotations',
    fields: [
      { id: 'companyName', label: 'Insurance Provider', type: 'select', required: true, enabled: true, options: ['HDFC ERGO', 'ICICI Lombard', 'Tata AIG', 'Bajaj Allianz', 'Reliance General', 'Go Digit', 'Cholamandalam', 'Kotak General'] },
      { id: 'idv', label: 'Vehicle IDV (Insured Declared Value)', type: 'number', required: true, enabled: true, placeholder: '₹' },
      { id: 'basicOd', label: 'Own Damage (OD) Premium', type: 'number', required: true, enabled: true, placeholder: '₹' },
      { id: 'ncbDiscount', label: 'NCB Discount (%)', type: 'select', required: false, enabled: true, options: ['0%', '20%', '25%', '35%', '45%', '50%'] },
      { id: 'addonsSelected', label: 'Included Addons', type: 'select', required: false, enabled: true, options: ['Zero Dep', 'Engine Protector', 'Consumables', 'Return to Invoice', 'Roadside Assistance', 'Key Replacement', 'Tyre Protection'] },
      { id: 'thirdPartyPremium', label: 'Third Party (TP) Premium', type: 'number', required: true, enabled: true, placeholder: '₹' },
      { id: 'paCover', label: 'Personal Accident (PA) Cover (₹)', type: 'number', required: false, enabled: true, placeholder: '₹' },
      { id: 'netPremium', label: 'Net Premium (Pre-Tax)', type: 'number', required: true, enabled: true, placeholder: '₹' },
      { id: 'gstAmount', label: 'GST (18%)', type: 'number', required: true, enabled: true, placeholder: '₹' },
      { id: 'finalPremium', label: 'Final Payable Amount', type: 'number', required: true, enabled: true, placeholder: '₹' },
      { id: 'validityDays', label: 'Quote Validity (Days)', type: 'number', required: false, enabled: true, placeholder: 'e.g. 7' }
    ]
  },
  make_policy: {
    name: 'Make Policy (Policy Submission Form)',
    description: 'Fields, rates, and coverage options used when converting a lead and booking an issued policy for management approval',
    fields: [
      { id: 'vehicleType', label: 'Vehicle Category / Body Class', type: 'select', required: true, enabled: true, options: [
        'Two Wheeler (CC)',
        '3W GCV - Loading Rixa',
        '3W PCV - Passenger Rixa',
        'LMV - Private Car (CC)',
        'GCV - Loading Vehicle (GVW)',
        'PCV - Passenger Vehicle (Seating Capacity & CC)',
        'Agriculture Tractor',
        'Commercial Tractor (GVW)',
        'CPM - Machine',
        'Other - MISC D'
      ] },
      { id: 'policyType', label: 'Policy Coverage Option', type: 'select', required: true, enabled: true, options: [
        'zero IMT 23 100%',
        'NIL Dep with IMT 23 50%',
        'NIL Dep with Jack Cover',
        'NIL dep Without Jack cover',
        'Comprehensive',
        'Third Party (TP)',
        'Own Damage (OD)'
      ] },
      { id: 'companyName', label: 'Insurance Company', type: 'select', required: true, enabled: true, options: [
        'HDFC ERGO', 'ICICI Lombard', 'Tata AIG', 'Bajaj Allianz', 'Reliance General', 'Go Digit', 'National Insurance', 'New India Assurance', 'Oriental Insurance', 'United India Insurance', 'Kotak General', 'Cholamandalam'
      ] },
      { id: 'policyNumber', label: 'Issued Policy Number', type: 'text', required: true, enabled: true, placeholder: 'e.g. 2311200123456789' },
      { id: 'startDate', label: 'Policy Start Date (DD/MM/YYYY)', type: 'date', required: true, enabled: true },
      { id: 'endDate', label: 'Policy Expiry Date (DD/MM/YYYY)', type: 'date', required: true, enabled: true },
      { id: 'netPremium', label: 'Net Premium (Pre-Tax ₹)', type: 'number', required: true, enabled: true, placeholder: '₹' },
      { id: 'grossPremium', label: 'Gross Final Premium (₹)', type: 'number', required: true, enabled: true, placeholder: '₹' },
      { id: 'paymentMode', label: 'Payment Mode', type: 'select', required: true, enabled: true, options: ['Online / UPI', 'NEFT / RTGS', 'Cheque', 'Cash', 'Company Portal Link'] },
      { id: 'transactionNo', label: 'Payment UTR / Txn Reference No', type: 'text', required: false, enabled: true, placeholder: 'e.g. UTR12345678' },
      { id: 'agentRemark', label: 'Agent Remarks / Internal Notes', type: 'textarea', required: false, enabled: true, placeholder: 'Any specific instructions...' }
    ]
  },
  policies: {
    name: 'Policy Issuance Form',
    description: 'Fields required when converting a lead or quotation into an issued insurance policy',
    fields: [
      { id: 'policyNumber', label: 'Policy Number', type: 'text', required: true, enabled: true, placeholder: 'POL-12345678' },
      { id: 'companyName', label: 'Insurance Company', type: 'select', required: true, enabled: true, options: ['HDFC ERGO', 'ICICI Lombard', 'Tata AIG', 'Bajaj Allianz', 'Reliance General', 'Digit', 'National Insurance'] },
      { id: 'startDate', label: 'Policy Start Date', type: 'date', required: true, enabled: true },
      { id: 'endDate', label: 'Policy Expiry Date', type: 'date', required: true, enabled: true },
      { id: 'totalPremium', label: 'Total Premium Collected (₹)', type: 'number', required: true, enabled: true, placeholder: '₹' },
      { id: 'paymentMode', label: 'Payment Mode', type: 'select', required: true, enabled: true, options: ['Online Portal', 'UPI / QR', 'NEFT / RTGS', 'Cheque', 'Cash'] },
      { id: 'transactionRef', label: 'Payment Transaction ID / Reference', type: 'text', required: false, enabled: true, placeholder: 'UTR / Txn Ref' },
      { id: 'policyDocument', label: 'Upload Policy PDF', type: 'file', required: true, enabled: true }
    ]
  },
  claims: {
    name: 'Claims Intimation Form',
    description: 'Fields used to record and track customer motor insurance claim submissions',
    fields: [
      { id: 'claimNumber', label: 'Claim Number / Intimation ID', type: 'text', required: false, enabled: true, placeholder: 'CLM-001' },
      { id: 'lossDate', label: 'Accident / Loss Date', type: 'date', required: true, enabled: true },
      { id: 'claimType', label: 'Claim Type', type: 'select', required: true, enabled: true, options: ['Accidental Damage', 'Theft', 'Third Party Damage', 'Windshield Glass', 'Total Loss'] },
      { id: 'garageName', label: 'Repair Workshop / Garage Name', type: 'text', required: true, enabled: true, placeholder: 'Authorized Workshop' },
      { id: 'garageContact', label: 'Garage Contact Phone', type: 'text', required: false, enabled: true, placeholder: 'Phone Number' },
      { id: 'estimatedAmount', label: 'Estimated Repair Cost (₹)', type: 'number', required: true, enabled: true, placeholder: '₹' },
      { id: 'surveyorName', label: 'Appointed Surveyor Name', type: 'text', required: false, enabled: true, placeholder: 'Surveyor Name' },
      { id: 'surveyorMobile', label: 'Surveyor Mobile Number', type: 'text', required: false, enabled: true, placeholder: 'Mobile' },
      { id: 'claimDescription', label: 'Incident Description', type: 'textarea', required: true, enabled: true, placeholder: 'Detailed description of accident...' },
      { id: 'documents', label: 'Attach Claim Documents / Photos', type: 'file', required: false, enabled: true }
    ]
  },
  loans: {
    name: 'Vehicle Loans Form',
    description: 'Fields for managing customer vehicle loan applications and financing',
    fields: [
      { id: 'bankName', label: 'Financing Bank / NBFC', type: 'select', required: true, enabled: true, options: ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Kotak Mahindra Prime', 'Axis Bank', 'Cholamandalam Finance', 'Mahindra Finance', 'Tata Capital'] },
      { id: 'applicantName', label: 'Loan Applicant Name', type: 'text', required: true, enabled: true, placeholder: 'Full Name' },
      { id: 'loanAmount', label: 'Requested Loan Amount (₹)', type: 'number', required: true, enabled: true, placeholder: '₹' },
      { id: 'tenureMonths', label: 'Loan Tenure (Months)', type: 'select', required: true, enabled: true, options: ['12 Months', '24 Months', '36 Months', '48 Months', '60 Months', '84 Months'] },
      { id: 'interestRate', label: 'Annual Interest Rate (%)', type: 'number', required: true, enabled: true, placeholder: 'e.g. 8.75' },
      { id: 'emiAmount', label: 'Calculated Monthly EMI (₹)', type: 'number', required: false, enabled: true, placeholder: '₹' },
      { id: 'cibilScore', label: 'Customer CIBIL Score', type: 'number', required: false, enabled: true, placeholder: '300-900' },
      { id: 'loanStatus', label: 'Current Processing Stage', type: 'select', required: true, enabled: true, options: ['Documents Collected', 'Logged in with Bank', 'Approved', 'Disbursed', 'Rejected'] }
    ]
  },
  fitness: {
    name: 'Fitness Work Form',
    description: 'Fields for commercial vehicle fitness renewal and compliance certificates',
    fields: [
      { id: 'vehicleNumber', label: 'Vehicle Registration Number', type: 'text', required: true, enabled: true, placeholder: 'GJ... commercial' },
      { id: 'rtoOffice', label: 'RTO Authority Office', type: 'select', required: true, enabled: true, options: ['GJ-01 Ahmedabad Subhash Bridge', 'GJ-27 Ahmedabad Vastral', 'GJ-02 Mehsana', 'GJ-03 Rajkot', 'GJ-05 Surat', 'GJ-06 Vadodara', 'GJ-09 Himatnagar'] },
      { id: 'vehicleCategory', label: 'Vehicle Class', type: 'select', required: true, enabled: true, options: ['Goods Carrier (HGV)', 'Medium Goods Vehicle (MGV)', 'Light Commercial Vehicle (LCV)', 'Passenger Bus', 'Auto Rickshaw / Taxi'] },
      { id: 'inspectionDate', label: 'Inspection Appointment Date', type: 'date', required: false, enabled: true },
      { id: 'governmentFee', label: 'Government Fee (₹)', type: 'number', required: true, enabled: true, placeholder: '₹' },
      { id: 'serviceCharge', label: 'Service / Consultant Fee (₹)', type: 'number', required: false, enabled: true, placeholder: '₹' },
      { id: 'fitnessExpiryDate', label: 'New Fitness Expiry Date', type: 'date', required: false, enabled: true }
    ]
  },
  rto: {
    name: 'RTO Passing & Transfer Form',
    description: 'Fields for vehicle ownership transfer, NOC, hypothecation, and permits',
    fields: [
      { id: 'applicationType', label: 'RTO Application Type', type: 'select', required: true, enabled: true, options: ['Ownership Transfer (Transfer of Ownership)', 'Hypothecation Addition (HP Add)', 'Hypothecation Removal (HP Termination)', 'NOC (No Objection Certificate)', 'Duplicate RC Book', 'Address Change', 'National Permit'] },
      { id: 'vehicleNumber', label: 'Vehicle Number', type: 'text', required: true, enabled: true, placeholder: 'GJ...' },
      { id: 'rtoCode', label: 'RTO Division', type: 'text', required: true, enabled: true, placeholder: 'e.g. GJ01' },
      { id: 'challanNumber', label: 'Parivahan Challan / Application No', type: 'text', required: false, enabled: true, placeholder: 'PARI-123' },
      { id: 'status', label: 'Application Status', type: 'select', required: true, enabled: true, options: ['Documents Pending', 'Challan Generated', 'Slot Booked', 'Passing Completed', 'RC Dispatched'] }
    ]
  },
  onboarding: {
    name: 'Employee Onboarding Form',
    description: 'Fields required when onboarding new staff, telecallers, and sales executives',
    fields: [
      { id: 'fullName', label: 'Full Legal Name', type: 'text', required: true, enabled: true, isSystem: true, placeholder: 'As on Aadhaar Card' },
      { id: 'email', label: 'Official Login Email', type: 'text', required: true, enabled: true, isSystem: true, placeholder: 'name@torqueadvisors.com' },
      { id: 'personalMobile', label: 'Personal Mobile (Calling & WhatsApp)', type: 'text', required: true, enabled: true, placeholder: '10-digit number' },
      { id: 'homeMobile', label: 'Emergency / Alternate Contact', type: 'text', required: false, enabled: true, placeholder: 'Alternate number' },
      { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: false, enabled: true },
      { id: 'joiningDate', label: 'Date of Joining', type: 'date', required: true, enabled: true },
      { id: 'highestQualification', label: 'Highest Education Qualification', type: 'select', required: false, enabled: true, options: ['Higher Secondary (12th)', 'Diploma', 'Bachelor of Commerce (B.Com)', 'Bachelor of Arts (B.A)', 'Bachelor of Science (B.Sc)', 'Bachelor of Business Administration (BBA)', 'Bachelor of Engineering (B.E/B.Tech)', 'Master Degree (MBA/M.Com)', 'Other'] },
      { id: 'roleId', label: 'Assigned Role', type: 'select', required: true, enabled: true, isSystem: true },
      { id: 'managerId', label: 'Reporting Manager / Team Leader', type: 'select', required: false, enabled: true },
      { id: 'aadhaarNumber', label: 'Aadhaar Card Number', type: 'text', required: false, enabled: true, placeholder: '12-digit Aadhaar' },
      { id: 'panNumber', label: 'PAN Card Number', type: 'text', required: false, enabled: true, placeholder: '10-character PAN' },
      { id: 'bankAccount', label: 'Salary Bank Account Details', type: 'text', required: false, enabled: true, placeholder: 'Bank Name, A/C No, IFSC' }
    ]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Fetch form configurations (merged with stored SystemSetting values)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const formId = searchParams.get('formId')

    // Fetch all form customizations stored in system_settings
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: 'form_config_'
        }
      }
    })

    const customConfigs: Record<string, any> = {}
    for (const setting of settings) {
      const id = setting.key.replace('form_config_', '')
      customConfigs[id] = setting.value
    }

    // Build the final configurations by merging stored customization with defaults
    const result: Record<string, any> = {}
    for (const [key, defaultSchema] of Object.entries(DEFAULT_FORM_SCHEMAS)) {
      if (formId && formId !== key) continue

      const stored = customConfigs[key]
      if (stored && Array.isArray(stored.fields)) {
        result[key] = {
          name: defaultSchema.name,
          description: defaultSchema.description,
          fields: stored.fields,
          isCustomized: true,
          updatedAt: stored.updatedAt || null
        }
      } else {
        result[key] = {
          name: defaultSchema.name,
          description: defaultSchema.description,
          fields: defaultSchema.fields,
          isCustomized: false
        }
      }
    }

    // Include custom dynamic forms created by Admin that are not in defaults
    for (const [key, stored] of Object.entries(customConfigs)) {
      if (result[key]) continue
      if (formId && formId !== key) continue
      if (stored && Array.isArray(stored.fields)) {
        result[key] = {
          name: stored.name || key,
          description: stored.description || 'Custom business form',
          fields: stored.fields,
          isCustomized: true,
          isUserCreated: true,
          updatedAt: stored.updatedAt || null
        }
      }
    }

    if (formId) {
      if (!result[formId]) {
        return NextResponse.json({ error: `Form configuration for "${formId}" not found.` }, { status: 404 })
      }
      return NextResponse.json(result[formId])
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[Forms Config GET] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch form configurations' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: Save customizations for a specific form
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = context.role?.toUpperCase() || ''
  const isAdmin = userRole.includes('ADMIN') || userRole.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Administrators can modify form configurations.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { formId, name, description, fields } = body

    if (!formId || !Array.isArray(fields)) {
      return NextResponse.json({ error: 'formId and fields array are required.' }, { status: 400 })
    }

    const key = `form_config_${formId}`
    const payload = {
      formId,
      name: name || DEFAULT_FORM_SCHEMAS[formId]?.name || formId,
      description: description || DEFAULT_FORM_SCHEMAS[formId]?.description || 'Custom administrative form',
      fields,
      updatedAt: new Date().toISOString(),
      updatedBy: context.email
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value: payload
      },
      create: {
        key,
        value: payload
      }
    })

    // Log the configuration change
    try {
      await prisma.activityLog.create({
        data: {
          userId: context.userId,
          action: 'FORM_CONFIG_UPDATED',
          entityType: 'SystemSetting',
          entityId: setting.id,
          metadata: {
            formId,
            fieldCount: fields.length,
            updatedBy: context.email
          }
        }
      })
    } catch (logErr) {
      console.warn('Failed to log form config update:', logErr)
    }

    return NextResponse.json({
      success: true,
      message: `Form configuration for "${formId}" saved successfully.`,
      setting
    })
  } catch (err: any) {
    console.error('[Forms Config POST] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to save form configuration' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE: Reset a form configuration back to default
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = context.role?.toUpperCase() || ''
  const isAdmin = userRole.includes('ADMIN') || userRole.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Administrators can reset form configurations.' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const formId = searchParams.get('formId')

    if (!formId) {
      return NextResponse.json({ error: 'formId query parameter is required.' }, { status: 400 })
    }

    const key = `form_config_${formId}`
    await prisma.systemSetting.deleteMany({
      where: { key }
    })

    return NextResponse.json({
      success: true,
      message: `Form "${formId}" has been reset to default configuration.`,
      defaultSchema: DEFAULT_FORM_SCHEMAS[formId] || null
    })
  } catch (err: any) {
    console.error('[Forms Config DELETE] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to reset form configuration' }, { status: 500 })
  }
}
