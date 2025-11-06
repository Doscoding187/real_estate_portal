/**
 * DEV ROUTER - Development-only endpoints for local testing
 * ⚠️ DELETE THIS FILE before production deployment
 *
 * This router provides manual webhook triggering for local development
 * when domain and Stripe webhooks are not yet configured
 */

import { z } from 'zod';
import { router, publicProcedure } from './_core/trpc';
import { getDb } from './db';
import { agencies, invitations, users, plans } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { MockEmailService } from './_core/email/mockEmailService';

export const devRouter = router({
  /**
   * Manually trigger webhook for local testing
   * Simulates what Stripe webhook would do after successful payment
   */
  triggerWebhookManual: publicProcedure
    .input(
      z.object({
        agencyId: z.number(),
        planId: z.number(),
        sessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { agencyId, planId } = input;
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      console.log('🔧 [DEV] Manual webhook trigger', { agencyId, planId });

      try {
        // 1. Update agency to active
        await db
          .update(agencies)
          .set({
            subscriptionStatus: 'active',
            updatedAt: new Date(),
          })
          .where(eq(agencies.id, agencyId));

        console.log('✅ Agency activated');

        // 2. Get agency details with owner
        const [agency] = await db
          .select({
            id: agencies.id,
            name: agencies.name,
            email: agencies.email,
            ownerEmail: users.email,
            ownerName: users.name,
            ownerFirstName: users.firstName,
          })
          .from(agencies)
          .leftJoin(users, eq(users.agencyId, agencies.id))
          .where(eq(agencies.id, agencyId))
          .limit(1);

        if (!agency) {
          throw new Error(`Agency ${agencyId} not found`);
        }

        const [plan] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);

        console.log(`📊 Agency: ${agency.name}, Plan: ${plan?.displayName || planId}`);

        // 3. Get pending invitations
        const teamInvitations = await db
          .select()
          .from(invitations)
          .where(and(eq(invitations.agencyId, agencyId), eq(invitations.status, 'pending')))
          .limit(50);

        console.log(`📨 Found ${teamInvitations.length} pending invitations`);

        // 4. Send mock team invitation emails
        let successCount = 0;
        const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';

        for (const invitation of teamInvitations) {
          try {
            const inviteUrl = `${appUrl}/invite/accept?token=${invitation.token}`;
            const inviterName =
              agency.ownerName ||
              agency.ownerFirstName ||
              agency.ownerEmail?.split('@')[0] ||
              'Your colleague';

            await MockEmailService.sendTeamInvitationEmail({
              to: invitation.email,
              agencyName: agency.name,
              inviterName,
              invitationUrl: inviteUrl,
              expiresAt: new Date(invitation.expiresAt),
            });

            successCount++;
            console.log(`✅ Invitation sent to ${invitation.email}`);
          } catch (error) {
            console.error(`❌ Failed invitation to ${invitation.email}:`, error);
          }
        }

        console.log(`📧 Sent ${successCount}/${teamInvitations.length} team invitations`);

        // 5. Send welcome email to agency owner
        if (agency.email) {
          try {
            await MockEmailService.sendAgencyWelcomeEmail({
              to: agency.email,
              agencyName: agency.name,
              dashboardUrl: `${appUrl}/agency/dashboard`,
              planName: plan?.displayName || `Plan ${planId}`,
              teamInvitesSent: successCount,
            });
            console.log(`✅ Welcome email sent to ${agency.email}`);
          } catch (error) {
            console.error(`❌ Failed to send welcome email:`, error);
          }
        }

        console.log(`✅ [DEV] Webhook simulation complete`);

        return {
          success: true,
          agencyActivated: true,
          invitationsSent: successCount,
          invitationsTotal: teamInvitations.length,
          message: `Agency activated! ${successCount}/${teamInvitations.length} invitations sent. Check console for email logs.`,
        };
      } catch (error) {
        console.error('❌ [DEV] Webhook simulation failed:', error);
        throw error;
      }
    }),
});
