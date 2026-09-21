import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { TORQUE_LOGO_BASE64 } from './logo-base64'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const company = searchParams.get('company') || 'Selected Insurer'
  const date = searchParams.get('date') || new Date().toLocaleDateString('en-GB')
  const netPremium = searchParams.get('netPremium') ? `₹${Number(searchParams.get('netPremium')).toLocaleString()}` : '-'
  const totalPremium = searchParams.get('totalPremium') ? `₹${Number(searchParams.get('totalPremium')).toLocaleString()}` : '-'
  const rate = searchParams.get('rate') ? `₹${Number(searchParams.get('rate')).toLocaleString()}` : '-'
  const benefit = searchParams.get('benefit') ? `₹${Number(searchParams.get('benefit')).toLocaleString()}` : '-'
  const remarks = searchParams.get('remarks') || ''
  const vehicleNo = searchParams.get('vehicleNo') || ''
  const advisorName = searchParams.get('advisor') || 'Sales 1'

  const logoBase64 = TORQUE_LOGO_BASE64

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          padding: '40px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background Decorative Frame */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            right: '16px',
            bottom: '16px',
            border: '2px solid #E2E8F0',
            borderRadius: '24px',
            display: 'flex',
          }}
        />

        {/* Diagonal Torque Watermark across entire card */}
        <div
          style={{
            position: 'absolute',
            top: '0px',
            left: '0px',
            right: '0px',
            bottom: '0px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.08,
            transform: 'rotate(-25deg)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoBase64}
            alt="Watermark"
            width={650}
            height={380}
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Watermark Pattern Texts */}
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            left: '40px',
            display: 'flex',
            opacity: 0.12,
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '2px',
            color: '#002FA7',
          }}
        >
          TORQUE AUTO ADVISOR • OFFICIAL RATE ESTIMATE • VERIFIED QUOTE
        </div>

        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #F1F5F9',
            paddingBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '18px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoBase64}
              alt="Torque Logo"
              width={180}
              height={70}
              style={{ objectFit: 'contain' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
                TORQUE AUTO ADVISOR
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#002FA7', letterSpacing: '0.5px' }}>
                OFFICIAL INSURANCE RATE CALCULATION
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '8px 16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Calculation Date
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
              {date}
            </div>
          </div>
        </div>

        {/* Insurance Company Header Banner */}
        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#002FA7',
            borderRadius: '16px',
            padding: '16px 24px',
            color: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#93C5FD', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Selected Insurance Company
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }}>
              {company}
            </div>
          </div>
          {vehicleNo ? (
            <div
              style={{
                display: 'flex',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '14px',
                fontWeight: 800,
                color: '#FFFFFF',
              }}
            >
              {vehicleNo}
            </div>
          ) : null}
        </div>

        {/* Remarks Box if present */}
        {remarks ? (
          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px 18px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              Coverage & Policy Notes
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: '4px' }}>
              {remarks}
            </div>
          </div>
        ) : null}

        {/* Inputs Breakdown Grid */}
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            flexDirection: 'row',
            gap: '16px',
          }}
        >
          {/* Net Premium */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #CBD5E1',
              borderRadius: '14px',
              padding: '18px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              Net Premium
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#1E293B', marginTop: '6px' }}>
              {netPremium}
            </div>
          </div>

          {/* Total Premium */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #CBD5E1',
              borderRadius: '14px',
              padding: '18px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              Total Premium (with GST)
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#1E293B', marginTop: '6px' }}>
              {totalPremium}
            </div>
          </div>
        </div>

        {/* Primary Calculations Results: Rate & Benefit */}
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            flexDirection: 'row',
            gap: '16px',
          }}
        >
          {/* Payable Rate (Highlighted Emerald) */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#F0FDF4',
              border: '2px solid #86EFAC',
              borderRadius: '16px',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Customer Payable Rate
              </div>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#DCFCE7',
                  borderRadius: '20px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#15803D',
                }}
              >
                Best Quote
              </div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 900, color: '#15803D', marginTop: '8px' }}>
              {rate}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#166534', marginTop: '4px' }}>
              Net amount payable by client
            </div>
          </div>

          {/* Customer Benefit / Total Savings (Highlighted Blue) */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#EFF6FF',
              border: '2px solid #93C5FD',
              borderRadius: '16px',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Customer Benefit / Savings
              </div>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#DBEAFE',
                  borderRadius: '20px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#1D4ED8',
                }}
              >
                Instant Savings
              </div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 900, color: '#002FA7', marginTop: '8px' }}>
              {benefit}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#1E40AF', marginTop: '4px' }}>
              Total direct customer discount
            </div>
          </div>
        </div>

        {/* Advisor & Verification Bar */}
        <div
          style={{
            marginTop: '18px',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '10px 18px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
            Prepared by Sales Advisor:
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
            {advisorName}
          </div>
        </div>

        {/* Footer Disclaimer & Branding */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1.5px solid #F1F5F9',
            paddingTop: '18px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
              Torque Auto Advisor • Licensed & Authorized Motor Insurance Partner
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
              Subject to vehicle inspection and insurer underwriting norms at time of booking.
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F1F5F9',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#475569',
            }}
          >
            Official Quote
          </div>
        </div>
      </div>
    ),
    {
      width: 800,
      height: 960,
    }
  )
}
