import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendVerificationEmailParams {
  to: string;
  verificationToken: string;
  name?: string;
}

export async function sendVerificationEmail({
  to,
  verificationToken,
  name,
}: SendVerificationEmailParams) {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Property Listify <onboarding@resend.dev>',
      to: [to],
      subject: 'Verify your email - Property Listify',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Property Listify</h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 20px;">
                <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px;">Welcome${name ? `, ${name}` : ''}! 👋</h2>
                
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                  Thank you for registering with Property Listify. To complete your registration and access all features, please verify your email address.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Verify Email Address
                  </a>
                </div>
                
                <p style="color: #6b7280; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
                </p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 0;">
                    If you didn't create an account with Property Listify, you can safely ignore this email.
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} Property Listify. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Email] Failed to send verification email:', error);
      throw new Error(`Email send failed: ${error.message}`);
    }

    console.log('[Email] Verification email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('[Email] Error sending verification email:', error);
    throw error;
  }
}

interface SendPasswordResetEmailParams {
  to: string;
  resetToken: string;
  name?: string;
}

export async function sendPasswordResetEmail({
  to,
  resetToken,
  name,
}: SendPasswordResetEmailParams) {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Property Listify <onboarding@resend.dev>',
      to: [to],
      subject: 'Reset your password - Property Listify',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Property Listify</h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 20px;">
                <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px;">Password Reset Request 🔒</h2>
                
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                  ${name ? `Hi ${name}, ` : ''}We received a request to reset your password. Click the button below to create a new password.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Reset Password
                  </a>
                </div>
                
                <p style="color: #6b7280; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
                </p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 0;">
                    <strong>This link will expire in 1 hour.</strong><br><br>
                    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} Property Listify. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Email] Failed to send password reset email:', error);
      throw new Error(`Email send failed: ${error.message}`);
    }

    console.log('[Email] Password reset email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('[Email] Error sending password reset email:', error);
    throw error;
  }
}
