export interface ReceiptData {
  receiptNo: string;
  date: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  description: string;
}

export function getReceiptHTML(data: ReceiptData): string {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(data.amount);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Receipt - ${data.receiptNo}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333;
          margin: 0;
          padding: 20px;
          line-height: 1.4;
          background-color: #ffffff;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #e2e8f0;
          padding: 40px;
          border-radius: 8px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #1e293b;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo-area h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 900;
          color: #1e293b;
          letter-spacing: 0.5px;
        }
        .logo-area p {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
        }
        .receipt-title {
          text-align: right;
        }
        .receipt-title h2 {
          margin: 0;
          font-size: 22px;
          color: #0f766e;
          font-weight: 800;
          text-transform: uppercase;
        }
        .receipt-title p {
          margin: 6px 0 0 0;
          font-size: 13px;
          color: #475569;
          font-weight: 600;
        }
        .info-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          gap: 20px;
        }
        .info-block {
          flex: 1;
        }
        .info-block h3 {
          margin: 0 0 10px 0;
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 4px;
        }
        .info-block p {
          margin: 4px 0;
          font-size: 14px;
          color: #1e293b;
          font-weight: 500;
        }
        .info-block .bold {
          font-weight: 700;
        }
        .table-area {
          margin-bottom: 40px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        th {
          background-color: #f1f5f9;
          color: #475569;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 16px;
          border-bottom: 2px solid #cbd5e1;
        }
        td {
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
          color: #1e293b;
        }
        .amount-col {
          text-align: right;
          font-weight: 600;
        }
        .total-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .total-box {
          width: 300px;
          border-top: 2px solid #cbd5e1;
          padding-top: 10px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
          color: #475569;
        }
        .total-row.grand-total {
          font-size: 18px;
          font-weight: 900;
          color: #1e293b;
          border-top: 1px dashed #cbd5e1;
          padding-top: 12px;
          margin-top: 4px;
        }
        .footer {
          margin-top: 60px;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }
        .signature-area {
          display: flex;
          justify-content: space-between;
          margin-top: 50px;
          padding: 0 40px;
        }
        .signature-box {
          text-align: center;
          width: 200px;
        }
        .signature-line {
          border-bottom: 1px solid #94a3b8;
          margin-bottom: 8px;
          height: 40px;
        }
        .signature-box p {
          margin: 0;
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-area">
            <h1>TORQUE</h1>
            <p>Auto Advisor & Insurance Services</p>
          </div>
          <div class="receipt-title">
            <h2>Payment Receipt</h2>
            <p>Receipt No: ${data.receiptNo}</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <h3>Receipt To</h3>
            <p class="bold">${data.customerName}</p>
            <p>Phone: ${data.customerPhone}</p>
          </div>
          <div class="info-block">
            <h3>Payment Details</h3>
            <p>Date: ${data.date}</p>
            <p>Method: <span style="text-transform: capitalize;">${data.paymentMethod}</span></p>
            ${data.referenceNumber ? `<p>Ref No: ${data.referenceNumber}</p>` : ''}
          </div>
        </div>

        <div class="table-area">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${data.description}</td>
                <td class="amount-col">${formattedAmount}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="total-section">
          <div class="total-box">
            <div class="total-row">
              <span>Subtotal</span>
              <span>${formattedAmount}</span>
            </div>
            <div class="total-row grand-total">
              <span>Total Received</span>
              <span>${formattedAmount}</span>
            </div>
          </div>
        </div>

        <div class="signature-area">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>Customer Signature</p>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>Authorized Signatory</p>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for choosing Torque Auto Advisor.</p>
          <p>This is a computer-generated receipt and does not require a physical signature.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
