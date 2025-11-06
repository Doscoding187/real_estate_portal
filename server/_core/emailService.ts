import { ENV } from './env';

// Email service interface
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Basic email service (placeholder for actual implementation)
// In production, you'd integrate with services like SendGrid, AWS SES, etc.
export class EmailService {
  static async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      console.log('[Email] Sending email:', {
        to: emailData.to,
        subject: emailData.subject,
        // Don't log HTML content for security
      });

      // TODO: Implement actual email sending
      // This is a placeholder that would be replaced with actual email service integration

      // For now, just log the email (useful for testing)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Email] Development mode - email content:');
        console.log('Subject:', emailData.subject);
        console.log('To:', emailData.to);
        console.log('HTML length:', emailData.html.length);
      }

      return true;
    } catch (error) {
      console.error('[Email] Failed to send email:', error);
      return false;
    }
  }

  // Pre-built email templates
  static async sendSubscriptionCreatedEmail(
    email: string,
    agencyName: string,
    planName: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Welcome to SA Property Portal Premium!</h1>
        <p>Dear ${agencyName} team,</p>
        <p>Thank you for upgrading to our <strong>${planName}</strong> plan!</p>
        <p>Your subscription is now active and you have access to all premium features including:</p>
        <ul>
          <li>Unlimited property listings</li>
          <li>Advanced analytics and reporting</li>
          <li>Priority support</li>
          <li>Custom branding options</li>
        </ul>
        <p>You can manage your subscription and billing details in your agency dashboard.</p>
        <p>Best regards,<br>The SA Property Portal Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Welcome to SA Property Portal ${planName} Plan!`,
      html,
    });
  }

  static async sendPaymentFailedEmail(
    email: string,
    agencyName: string,
    amount: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Payment Failed</h1>
        <p>Dear ${agencyName} team,</p>
        <p>We were unable to process your payment of ${amount}.</p>
        <p>This could be due to:</p>
        <ul>
          <li>Insufficient funds</li>
          <li>Expired card</li>
          <li>Incorrect card details</li>
        </ul>
        <p>Please update your payment method in your billing dashboard to avoid service interruption.</p>
        <p>If you need assistance, please contact our support team.</p>
        <p>Best regards,<br>The SA Property Portal Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Payment Failed - Action Required',
      html,
    });
  }

  static async sendSubscriptionCancelledEmail(
    email: string,
    agencyName: string,
    endDate: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Subscription Cancelled</h1>
        <p>Dear ${agencyName} team,</p>
        <p>Your subscription has been cancelled and will remain active until ${endDate}.</p>
        <p>You will continue to have access to all premium features until this date.</p>
        <p>If you'd like to reactivate your subscription, you can do so anytime in your billing dashboard.</p>
        <p>Thank you for being part of SA Property Portal.</p>
        <p>Best regards,<br>The SA Property Portal Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Subscription Cancelled',
      html,
    });
  }

  static async sendInvoiceEmail(
    email: string,
    agencyName: string,
    invoiceUrl: string,
    amount: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Invoice Available</h1>
        <p>Dear ${agencyName} team,</p>
        <p>Your invoice for ${amount} is now available.</p>
        <p>You can view and download your invoice here: <a href="${invoiceUrl}">View Invoice</a></p>
        <p>If you have any questions about this invoice, please contact our support team.</p>
        <p>Best regards,<br>The SA Property Portal Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Invoice Available - ${amount}`,
      html,
    });
  }

  static async sendTrialEndingEmail(
    email: string,
    agencyName: string,
    daysLeft: number,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Trial Ending Soon</h1>
        <p>Dear ${agencyName} team,</p>
        <p>Your free trial will end in ${daysLeft} days.</p>
        <p>To continue enjoying our premium features, please add a payment method to your account.</p>
        <p>You can manage your billing in the agency dashboard under the Billing section.</p>
        <p>Thank you for trying SA Property Portal!</p>
        <p>Best regards,<br>The SA Property Portal Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Trial Ending in ${daysLeft} Days`,
      html,
    });
  }

  static async sendAgencyInvitationEmail(
    email: string,
    inviterName: string,
    agencyName: string,
    acceptUrl: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>You're Invited to Join ${agencyName}</h1>
        <p>Hello,</p>
        <p>${inviterName} has invited you to join ${agencyName} on SA Property Portal.</p>
        <p>As a team member, you'll be able to:</p>
        <ul>
          <li>Collaborate on property listings</li>
          <li>Access agency analytics</li>
          <li>Manage leads together</li>
          <li>Use premium features</li>
        </ul>
        <p><a href="${acceptUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
        <p>This invitation will expire in 7 days.</p>
        <p>Best regards,<br>The SA Property Portal Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Invitation to join ${agencyName}`,
      html,
    });
  }

  static async sendViewingNotificationEmail(
    agentEmail: string,
    agentName: string,
    prospectName: string,
    prospectEmail: string,
    prospectPhone: string | undefined,
    propertyTitle: string,
    propertyPrice: string,
    scheduledAt: string,
    notes: string | undefined,
    buyabilityScore: 'low' | 'medium' | 'high' | undefined,
    affordabilityRange: string | undefined,
  ): Promise<boolean> {
    const scoreColor =
      buyabilityScore === 'high' ? '#10b981' : buyabilityScore === 'medium' ? '#f59e0b' : '#ef4444';
    const scoreText =
      buyabilityScore === 'high' ? 'High' : buyabilityScore === 'medium' ? 'Medium' : 'Low';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #1f2937; margin-bottom: 20px;">🏡 New Property Viewing Scheduled!</h1>

          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e40af; margin: 0 0 10px 0;">Viewing Details</h2>
            <p style="margin: 5px 0; color: #374151;"><strong>Property:</strong> ${propertyTitle}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Price:</strong> R${propertyPrice}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Scheduled:</strong> ${new Date(
              scheduledAt,
            ).toLocaleString('en-ZA', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
            ${notes ? `<p style="margin: 5px 0; color: #374151;"><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>

          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #166534; margin: 0 0 10px 0;">Prospect Information</h2>
            <p style="margin: 5px 0; color: #374151;"><strong>Name:</strong> ${prospectName}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Email:</strong> <a href="mailto:${prospectEmail}" style="color: #3b82f6;">${prospectEmail}</a></p>
            ${prospectPhone ? `<p style="margin: 5px 0; color: #374151;"><strong>Phone:</strong> <a href="tel:${prospectPhone}" style="color: #3b82f6;">${prospectPhone}</a></p>` : ''}

            ${
              buyabilityScore
                ? `
            <div style="margin-top: 15px; padding: 10px; background-color: white; border-radius: 6px; border-left: 4px solid ${scoreColor};">
              <p style="margin: 0; color: #374151;"><strong>Buyability Score:</strong>
                <span style="color: ${scoreColor}; font-weight: bold;"> ${scoreText}</span>
              </p>
              ${affordabilityRange ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Affordability: ${affordabilityRange}</p>` : ''}
            </div>
            `
                : ''
            }
          </div>

          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0;">💡 Pro Tip</h3>
            <p style="margin: 0; color: #78350f; font-size: 14px;">
              This prospect has been pre-qualified using our advanced buyability calculator.
              ${
                buyabilityScore === 'high'
                  ? 'They appear to be a highly qualified buyer - prioritize this viewing!'
                  : buyabilityScore === 'medium'
                    ? 'They show moderate buying potential - a good opportunity to convert.'
                    : 'They may need some financial guidance or additional time to prepare.'
              }
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:${prospectEmail}"
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Contact Prospect
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            <p>This viewing was scheduled through the SA Property Portal prospect pre-qualification system.</p>
            <p>Learn more about our gamified prospect dashboard at <a href="#" style="color: #3b82f6;">portal.sa</a></p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: agentEmail,
      subject: `🏡 New Viewing: ${prospectName} wants to view ${propertyTitle}`,
      html,
    });
  }

  static async sendProspectGamificationEmail(
    prospectEmail: string,
    prospectName: string,
    badges: string[],
    currentProgress: number,
    recommendedProperties: Array<{ title: string; price: string; url: string }>,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #1f2937; text-align: center; margin-bottom: 20px;">🎯 You're Making Great Progress!</h1>

          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 48px; margin-bottom: 10px;">🏆</div>
            <p style="color: #6b7280; font-size: 16px;">Profile Completion: ${currentProgress}%</p>
            <div style="width: 100%; height: 8px; background-color: #e5e7eb; border-radius: 4px; margin: 10px 0;">
              <div style="width: ${currentProgress}%; height: 8px; background-color: #3b82f6; border-radius: 4px;"></div>
            </div>
          </div>

          ${
            badges.length > 0
              ? `
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #92400e; margin: 0 0 15px 0;">🎖️ New Badges Earned!</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              ${badges.map(badge => `<span style="background-color: #fbbf24; color: #92400e; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: bold;">${badge}</span>`).join('')}
            </div>
          </div>
          `
              : ''
          }

          ${
            recommendedProperties.length > 0
              ? `
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0;">🏠 Properties You Can Afford</h3>
            ${recommendedProperties
              .map(
                property => `
              <div style="background-color: white; padding: 15px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #3b82f6;">
                <h4 style="margin: 0 0 5px 0; color: #1f2937;">${property.title}</h4>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">From R${property.price}</p>
                <a href="${property.url}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">View Property →</a>
              </div>
            `,
              )
              .join('')}
          </div>
          `
              : ''
          }

          <div style="text-align: center; margin-top: 30px;">
            <a href="#"
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Continue Your Search
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            <p>You're receiving this because you started using our buyability calculator.</p>
            <p>Want to stop these emails? <a href="#" style="color: #3b82f6;">Unsubscribe</a></p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: prospectEmail,
      subject: `🎯 ${prospectName}, you've unlocked ${badges.length} new badge${badges.length !== 1 ? 's' : ''}!`,
      html,
    });
  }

  // New email templates for Phase 3 & 4 features

  static async sendNewLeadNotificationEmail(
    agentEmail: string,
    agentName: string,
    leadName: string,
    leadEmail: string,
    propertyTitle: string,
    propertyPrice: string,
    message: string | undefined,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #1f2937; margin-bottom: 20px;">🆕 New Lead Assigned!</h1>

          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e40af; margin: 0 0 10px 0;">Lead Details</h2>
            <p style="margin: 5px 0; color: #374151;"><strong>Name:</strong> ${leadName}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Email:</strong> <a href="mailto:${leadEmail}" style="color: #3b82f6;">${leadEmail}</a></p>
            <p style="margin: 5px 0; color: #374151;"><strong>Property:</strong> ${propertyTitle}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Price:</strong> R${propertyPrice}</p>
            ${message ? `<p style="margin: 5px 0; color: #374151;"><strong>Message:</strong> "${message}"</p>` : ''}
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:${leadEmail}"
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Contact Lead Now
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            <p>This lead has been automatically assigned to you through the SA Property Portal.</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: agentEmail,
      subject: `🆕 New Lead: ${leadName} interested in ${propertyTitle}`,
      html,
    });
  }

  static async sendOfferReceivedNotificationEmail(
    agentEmail: string,
    agentName: string,
    buyerName: string,
    propertyTitle: string,
    offerAmount: string,
    expiresAt: string | undefined,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #1f2937; margin-bottom: 20px;">💰 New Offer Received!</h1>

          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #92400e; margin: 0 0 10px 0;">Offer Details</h2>
            <p style="margin: 5px 0; color: #374151;"><strong>Property:</strong> ${propertyTitle}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Buyer:</strong> ${buyerName}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Offer Amount:</strong> R${offerAmount}</p>
            ${expiresAt ? `<p style="margin: 5px 0; color: #374151;"><strong>Expires:</strong> ${new Date(expiresAt).toLocaleDateString()}</p>` : ''}
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="#"
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
              Review Offer
            </a>
            <a href="#"
               style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Accept Offer
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            <p>A new offer has been submitted for one of your listings.</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: agentEmail,
      subject: `💰 Offer Received: R${offerAmount} for ${propertyTitle}`,
      html,
    });
  }
}
