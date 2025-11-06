/**
 * MOCK EMAIL SERVICE - FOR LOCAL DEVELOPMENT ONLY
 * This logs emails to console instead of actually sending them
 * Replace with real email service when domain is ready
 *
 * @dev-only This file should be replaced with real email service in production
 */

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export class MockEmailService {
  /**
   * Mock sendEmail - logs to console instead of sending
   */
  static async sendEmail(params: EmailParams): Promise<void> {
    console.log('\n📧 ========== MOCK EMAIL ==========');
    console.log(`From: ${params.from || 'noreply@localhost.dev'}`);
    console.log(`To: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log('\n--- HTML CONTENT ---');
    console.log(params.html);
    console.log('==================================\n');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate 95% success rate (5% random failures for testing error handling)
    if (Math.random() > 0.95) {
      throw new Error('Mock email service: Random failure for testing');
    }

    return Promise.resolve();
  }

  /**
   * Send team invitation email (mocked)
   */
  static async sendTeamInvitationEmail(params: {
    to: string;
    agencyName: string;
    inviterName: string;
    invitationUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    const { to, agencyName, inviterName, invitationUrl, expiresAt } = params;

    await this.sendEmail({
      to,
      subject: `You've been invited to join ${agencyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>You're Invited! 🎉</h1>
          <p>
            <strong>${inviterName}</strong> has invited you to join 
            <strong>${agencyName}</strong> on SA Property Portal.
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>What's next?</strong></p>
            <ol style="margin: 0; padding-left: 20px;">
              <li>Click the button below to accept your invitation</li>
              <li>Create your account or sign in</li>
              <li>Start collaborating with your team!</li>
            </ol>
          </div>

          <a href="${invitationUrl}" 
             style="display: inline-block; background: #2563eb; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                    font-weight: bold; margin: 20px 0;">
            Accept Invitation
          </a>

          <p style="color: #666; font-size: 14px;">
            This invitation expires on ${expiresAt.toLocaleDateString()}.
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  }

  /**
   * Send welcome email to agency owner (mocked)
   */
  static async sendAgencyWelcomeEmail(params: {
    to: string;
    agencyName: string;
    dashboardUrl: string;
    planName: string;
    teamInvitesSent: number;
  }): Promise<void> {
    const { to, agencyName, dashboardUrl, planName, teamInvitesSent } = params;

    await this.sendEmail({
      to,
      subject: `Welcome to SA Property Portal, ${agencyName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Welcome aboard, ${agencyName}! 🏠</h1>
          
          <p>
            Congratulations! Your agency is now active on our platform with the 
            <strong>${planName}</strong> plan.
          </p>

          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; 
                      padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>✅ Your account is fully activated</strong></p>
            <p style="margin: 10px 0 0 0;">
              ${teamInvitesSent > 0 ? `We've sent invitations to ${teamInvitesSent} team member${teamInvitesSent > 1 ? 's' : ''}.` : 'You can invite team members from your dashboard.'}
            </p>
          </div>

          <h3>Next Steps:</h3>
          <ol>
            <li>Complete your agency profile</li>
            <li>Add your first property listing</li>
            <li>Invite additional team members</li>
            <li>Configure your branding preferences</li>
          </ol>

          <a href="${dashboardUrl}" 
             style="display: inline-block; background: #2563eb; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                    font-weight: bold; margin: 20px 0;">
            Go to Dashboard
          </a>

          <p style="color: #666; margin-top: 30px;">
            Need help getting started? Contact our support team for assistance.
          </p>
        </div>
      `,
    });
  }
}
