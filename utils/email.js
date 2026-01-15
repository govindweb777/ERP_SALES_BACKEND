const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send welcome email with temporary password
 */
const sendWelcomeEmail = async (email, name, tempPassword, role) => {
  const mailOptions = {
    from: `"SalesERP" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to SalesERP - Your Account Details',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .credentials { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SalesERP!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your account has been created successfully. You have been assigned the role of <strong>${role}</strong>.</p>
            
            <div class="credentials">
              <h3>Your Login Credentials:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            </div>
            
            <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            
            <p>If you have any questions, please contact your administrator.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} SalesERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

/**
 * Send password reset email
 */
const sendResetPasswordEmail = async (email, name, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: `"SalesERP" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'SalesERP - Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
          .token { background: #fff; padding: 15px; border-radius: 8px; font-family: monospace; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="btn">Reset Password</a>
            </p>
            
            <p>Or use this reset token:</p>
            <div class="token">${resetToken}</div>
            
            <p><strong>Note:</strong> This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} SalesERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reset password email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending reset email:', error);
    return false;
  }
};

/**
 * Send branch creation notification
 */
const sendBranchCreatedEmail = async (email, name, branchName, adminEmail) => {
  const mailOptions = {
    from: `"SalesERP" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'SalesERP - New Branch Created',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .info { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Branch Created!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            <p>A new branch has been created and you have been assigned as the Branch Manager.</p>
            
            <div class="info">
              <h3>Branch Details:</h3>
              <p><strong>Branch Name:</strong> ${branchName}</p>
              <p><strong>Admin Contact:</strong> ${adminEmail}</p>
            </div>
            
            <p>You can now manage users and perform ERP operations for this branch.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} SalesERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Branch created email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending branch email:', error);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendBranchCreatedEmail
};
