"use client"
import React, { useRef } from 'react'
import { X, Printer, Download, CheckCircle2, Shield } from 'lucide-react'
import { formatDateDMY } from '@/lib/date-format'

export interface ReceiptData {
  receiptNo?: string
  date: string | Date
  clientName: string
  clientPhone?: string | null
  vehicleNo?: string | null
  amount: number
  paymentMethod: string
  referenceNumber?: string | null
  description?: string | null
  policyNumber?: string | null
  receivedBy?: string | null
}

function numberToIndianWords(num: number): string {
  if (isNaN(num) || num <= 0) return 'Zero Rupees Only'
  
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertTwoDigits = (n: number): string => {
    if (n < 20) return a[n]
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '')
  }

  const convertThreeDigits = (n: number): string => {
    const hundred = Math.floor(n / 100)
    const rest = n % 100
    let str = ''
    if (hundred > 0) str += a[hundred] + ' Hundred'
    if (rest > 0) {
      if (str !== '') str += ' '
      str += convertTwoDigits(rest)
    }
    return str
  }

  let crore = Math.floor(num / 10000000)
  num %= 10000000
  let lakh = Math.floor(num / 100000)
  num %= 100000
  let thousand = Math.floor(num / 1000)
  num %= 1000
  let remaining = Math.floor(num)

  let words = ''
  if (crore > 0) words += convertTwoDigits(crore) + ' Crore '
  if (lakh > 0) words += convertTwoDigits(lakh) + ' Lakh '
  if (thousand > 0) words += convertTwoDigits(thousand) + ' Thousand '
  if (remaining > 0) words += convertThreeDigits(remaining)

  return 'Rupees ' + words.trim() + ' Only'
}

export default function MoneyReceiptModal({
  data,
  isOpen,
  onClose,
}: {
  data: ReceiptData | null
  isOpen: boolean
  onClose: () => void
}) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !data) return null

  const receiptNo = data.receiptNo || `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
  const formattedDate = formatDateDMY(data.date)
  const amountWords = numberToIndianWords(data.amount)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Container - hide when printing external container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Payment Receipt Voucher</h2>
              <p className="text-xs text-gray-500">Official receipt matching legacy format</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Printer size={15} />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-8 overflow-y-auto print:p-0 print:m-0" ref={printRef} id="printable-receipt">
          {/* Print specific CSS */}
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-receipt, #printable-receipt * {
                visibility: visible;
              }
              #printable-receipt {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 24px;
                box-shadow: none;
                border: none;
              }
            }
          `}</style>

          <div className="border-2 border-gray-800 rounded-xl p-6 bg-white text-gray-900 shadow-xs">
            {/* Top Company Header */}
            <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight text-red-600 uppercase">
                    TORQUE AUTO ADVISOR
                  </h1>
                </div>
                <p className="text-[11px] font-medium text-gray-600 mt-0.5">
                  Commercial Vehicle Insurance & Financial Advisory Services
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Ahmedabad, Gujarat | Contact: +91 98980 00000 | Email: support@torqueadvisor.com
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-gray-900 text-white text-[11px] font-bold rounded uppercase tracking-wider">
                  Money Receipt
                </span>
                <p className="text-xs font-bold text-gray-800 mt-2">
                  No: <span className="font-mono text-red-600">{receiptNo}</span>
                </p>
                <p className="text-xs text-gray-600">
                  Date: <span className="font-medium">{formattedDate}</span>
                </p>
              </div>
            </div>

            {/* Receipt Content Table / Grid */}
            <div className="py-4 space-y-3.5 text-sm">
              <div className="flex items-center border-b border-gray-200 pb-2">
                <span className="w-36 text-xs font-semibold text-gray-600 uppercase">Received From:</span>
                <span className="font-bold text-gray-900 text-base flex-1">
                  {data.clientName} {data.clientPhone ? `(${data.clientPhone})` : ''}
                </span>
              </div>

              {data.vehicleNo && (
                <div className="flex items-center border-b border-gray-200 pb-2">
                  <span className="w-36 text-xs font-semibold text-gray-600 uppercase">Vehicle Number:</span>
                  <span className="font-mono font-bold text-gray-900 tracking-wider bg-gray-100 px-2 py-0.5 rounded">
                    {data.vehicleNo.toUpperCase()}
                  </span>
                </div>
              )}

              {data.policyNumber && (
                <div className="flex items-center border-b border-gray-200 pb-2">
                  <span className="w-36 text-xs font-semibold text-gray-600 uppercase">Policy / Ref No:</span>
                  <span className="font-mono text-gray-800 font-semibold">{data.policyNumber}</span>
                </div>
              )}

              <div className="flex items-center border-b border-gray-200 pb-2">
                <span className="w-36 text-xs font-semibold text-gray-600 uppercase">Towards Account Of:</span>
                <span className="text-gray-800 font-medium">
                  {data.description || 'Commercial Vehicle Insurance Premium / Service Renewal'}
                </span>
              </div>

              <div className="flex items-center border-b border-gray-200 pb-2">
                <span className="w-36 text-xs font-semibold text-gray-600 uppercase">Payment Mode:</span>
                <span className="font-bold text-gray-900 uppercase">
                  {data.paymentMethod || 'Cash'}
                  {data.referenceNumber ? ` (Ref / Chq No: ${data.referenceNumber})` : ''}
                </span>
              </div>

              <div className="flex items-start border-b border-gray-200 pb-2">
                <span className="w-36 text-xs font-semibold text-gray-600 uppercase pt-0.5">Amount in Words:</span>
                <span className="text-xs font-bold text-gray-800 italic flex-1">{amountWords}</span>
              </div>

              {/* Amount Box */}
              <div className="flex items-center justify-between pt-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-600 rounded-xl">
                  <span className="text-xs font-bold text-red-900 uppercase">Amount Received:</span>
                  <span className="text-xl font-black text-red-600 font-mono">
                    ₹{data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold">
                  <CheckCircle2 size={14} />
                  <span>Payment Verified</span>
                </div>
              </div>
            </div>

            {/* Footer & Signatures */}
            <div className="mt-8 pt-6 border-t-2 border-gray-800 flex items-end justify-between text-xs">
              <div>
                <p className="text-[10px] text-gray-500">Subject to realization of cheque / payment transfer.</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Computer generated receipt • Torque Operating System</p>
              </div>
              <div className="text-center w-48">
                <div className="border-b border-gray-400 pb-1 mb-1">
                  <p className="font-medium text-gray-700">{data.receivedBy || 'Authorized Officer'}</p>
                </div>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                  For Torque Auto Advisor
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer transition-all"
          >
            <Printer size={14} />
            Print Receipt Voucher
          </button>
        </div>
      </div>
    </div>
  )
}
