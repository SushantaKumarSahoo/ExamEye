export const subscriptionUpgradeEmail = (data) => {
  const { 
    companyName, 
    planName, 
    amount, 
    paymentId, 
    startDate, 
    endDate,
    adminCode,
    features 
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .logo {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .success-badge {
      background: #ecfdf5;
      color: #059669;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
      border: 1px solid #a7f3d0;
    }
    .info-box {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #3b82f6;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      color: #6b7280;
      font-weight: 500;
    }
    .value {
      color: #1f2937;
      font-weight: 600;
    }
    .features {
      background: #f0f9ff;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .features ul {
      list-style: none;
      padding: 0;
      margin: 10px 0;
    }
    .features li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
    }
    .features li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #3b82f6;
      font-weight: bold;
    }
    .admin-code {
      background: #fef3c7;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #fde68a;
    }
    .code-value {
      font-family: 'Courier New', monospace;
      font-size: 1.2rem;
      font-weight: bold;
      color: #92400e;
      background: white;
      padding: 10px;
      border-radius: 4px;
      text-align: center;
      margin: 10px 0;
      letter-spacing: 2px;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      text-align: center;
      border-radius: 0 0 10px 10px;
      color: #6b7280;
      font-size: 0.9rem;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 8px;
      margin: 20px 0;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">👁️ ExamEye</div>
    <h2 style="margin: 0;">Subscription Upgraded Successfully!</h2>
  </div>
  
  <div class="content">
    <div class="success-badge">
      <h3 style="margin: 0;">🎉 Payment Successful</h3>
      <p style="margin: 10px 0 0 0;">Your subscription has been upgraded and is now active.</p>
    </div>

    <h3>Payment Details</h3>
    <div class="info-box">
      <div class="info-row">
        <span class="label">Company:</span>
        <span class="value">${companyName}</span>
      </div>
      <div class="info-row">
        <span class="label">Plan:</span>
        <span class="value">${planName}</span>
      </div>
      <div class="info-row">
        <span class="label">Amount Paid:</span>
        <span class="value">₹${amount.toLocaleString()}</span>
      </div>
      <div class="info-row">
        <span class="label">Payment ID:</span>
        <span class="value">${paymentId}</span>
      </div>
      <div class="info-row">
        <span class="label">Start Date:</span>
        <span class="value">${new Date(startDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      <div class="info-row">
        <span class="label">Expiry Date:</span>
        <span class="value">${new Date(endDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </div>

    <div class="admin-code">
      <h3 style="margin-top: 0; color: #92400e;">🔐 Your New Admin Code</h3>
      <p style="margin: 10px 0; color: #92400e;">Use this code for new admin registrations:</p>
      <div class="code-value">${adminCode}</div>
      <p style="margin: 10px 0 0 0; font-size: 0.9rem; color: #92400e;">
        <strong>Note:</strong> This code is valid until ${new Date(endDate).toLocaleDateString('en-IN')}
      </p>
    </div>

    <div class="features">
      <h3 style="margin-top: 0; color: #1f2937;">📦 Your Plan Includes:</h3>
      <ul>
        ${features.map(feature => `<li>${feature}</li>`).join('')}
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin" class="button">
        Access Dashboard
      </a>
    </div>

    <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #a7f3d0;">
      <p style="margin: 0; color: #047857; font-size: 0.9rem;">
        <strong>✓ All Features Activated:</strong> Your subscription is now active and all features are available for use.
      </p>
    </div>
  </div>

  <div class="footer">
    <p style="margin: 10px 0;">Thank you for choosing ExamEye!</p>
    <p style="margin: 10px 0;">If you have any questions, please contact our support team.</p>
    <p style="margin: 10px 0; font-size: 0.8rem;">
      This is an automated email. Please do not reply to this message.
    </p>
  </div>
</body>
</html>
  `;
};

export const subscriptionReminderEmail = (data) => {
  const { companyName, planName, daysRemaining, endDate } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .warning-box {
      background: #fef3c7;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #fde68a;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 8px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      text-align: center;
      border-radius: 0 0 10px 10px;
      color: #6b7280;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size: 3rem;">⏰</div>
    <h2 style="margin: 10px 0 0 0;">Subscription Expiring Soon</h2>
  </div>
  
  <div class="content">
    <div class="warning-box">
      <h3 style="margin-top: 0; color: #92400e;">⚠️ Action Required</h3>
      <p style="margin: 0; color: #92400e;">
        Your <strong>${planName}</strong> subscription for <strong>${companyName}</strong> will expire in <strong>${daysRemaining} days</strong> on ${new Date(endDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}.
      </p>
    </div>

    <p>To avoid service interruption, please renew your subscription before the expiry date.</p>

    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/subscription" class="button">
        Renew Subscription
      </a>
    </div>
  </div>

  <div class="footer">
    <p style="margin: 10px 0;">ExamEye - Secure Online Examination Platform</p>
  </div>
</body>
</html>
  `;
};
