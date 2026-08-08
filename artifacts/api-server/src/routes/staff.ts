import { Router, type IRouter } from "express";
import {
  CancelStaffInviteParams,
  CancelStaffInviteQueryParams,
  CreateStaffInviteBody,
  ListStaffRosterQueryParams,
  RevokeStaffAccessParams,
  RevokeStaffAccessQueryParams,
} from "@workspace/api-zod";
import { requireStaff, type AuthenticatedRequest } from "../lib/auth";
import {
  cancelStaffInvite,
  createStaffInvite,
  getUserPublicationAccess,
  listStaffRoster,
  recordAuditEvent,
  revokeStaffAccess,
} from "../lib/platform";

const router: IRouter = Router();

// ── Auth helper ───────────────────────────────────────────────────────────────

/**
 * Verify the calling user has publication:write permission for the requested
 * publication. Only the publication-admin role carries this permission.
 */
async function requireAdminAccess(
  req: Parameters<typeof requireStaff>[0],
  res: Parameters<typeof requireStaff>[1],
  publicationId: string,
) {
  const user = (req as AuthenticatedRequest).localUser;
  if (!user) {
    res.status(403).json({ error: "No publication access" });
    return null;
  }
  const access = await getUserPublicationAccess(user.id, publicationId);
  if (!access || !access.permissions.includes("publication:write")) {
    res.status(403).json({ error: "Publication admin access required" });
    return null;
  }
  return { user, access };
}

// ── GET /staff/members ────────────────────────────────────────────────────────

router.get(
  "/staff/members",
  requireStaff,
  async (req, res): Promise<void> => {
    const parsed = ListStaffRosterQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "publicationId is required" });
      return;
    }
    const scope = await requireAdminAccess(req, res, parsed.data.publicationId);
    if (!scope) return;

    const roster = await listStaffRoster(parsed.data.publicationId);
    res.json(roster);
  },
);

// ── POST /staff/invites ───────────────────────────────────────────────────────

router.post(
  "/staff/invites",
  requireStaff,
  async (req, res): Promise<void> => {
    const parsed = CreateStaffInviteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const scope = await requireAdminAccess(req, res, parsed.data.publicationId);
    if (!scope) return;

    // Prevent inviting yourself
    if (scope.user.email.toLowerCase() === parsed.data.email.toLowerCase()) {
      res
        .status(400)
        .json({ error: "You cannot invite yourself — you already have access." });
      return;
    }

    try {
      const outcome = await createStaffInvite({
        publicationId: parsed.data.publicationId,
        email: parsed.data.email,
        role: parsed.data.role,
        invitedByUserId: scope.user.id,
      });

      await recordAuditEvent({
        publicationId: parsed.data.publicationId,
        userId: scope.user.id,
        action:
          outcome.result === "granted"
            ? "staff.access.granted"
            : "staff.invite.created",
        entityType:
          outcome.result === "granted" ? "user" : "staff_invite",
        entityId:
          outcome.result === "granted"
            ? outcome.member.userId
            : outcome.invite.id,
        metadata: {
          email: parsed.data.email,
          role: parsed.data.role,
          result: outcome.result,
        },
      });

      res.json(outcome);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create invite";
      res.status(400).json({ error: message });
    }
  },
);

// ── DELETE /staff/members/:userId ─────────────────────────────────────────────

router.delete(
  "/staff/members/:userId",
  requireStaff,
  async (req, res): Promise<void> => {
    const params = RevokeStaffAccessParams.safeParse(req.params);
    const query = RevokeStaffAccessQueryParams.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({
        error: "userId param and publicationId query are required",
      });
      return;
    }

    const scope = await requireAdminAccess(req, res, query.data.publicationId);
    if (!scope) return;

    // Prevent removing yourself
    if (scope.user.id === params.data.userId) {
      res.status(400).json({ error: "You cannot remove your own access." });
      return;
    }

    const revoked = await revokeStaffAccess(
      query.data.publicationId,
      params.data.userId,
    );
    if (!revoked) {
      res
        .status(404)
        .json({ error: "Staff member not found for this publication" });
      return;
    }

    await recordAuditEvent({
      publicationId: query.data.publicationId,
      userId: scope.user.id,
      action: "staff.access.revoked",
      entityType: "user",
      entityId: params.data.userId,
      metadata: {},
    });

    res.json({ revoked: true });
  },
);

// ── DELETE /staff/invites/:inviteId ───────────────────────────────────────────

router.delete(
  "/staff/invites/:inviteId",
  requireStaff,
  async (req, res): Promise<void> => {
    const params = CancelStaffInviteParams.safeParse(req.params);
    const query = CancelStaffInviteQueryParams.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({
        error: "inviteId param and publicationId query are required",
      });
      return;
    }

    const scope = await requireAdminAccess(req, res, query.data.publicationId);
    if (!scope) return;

    const cancelled = await cancelStaffInvite(
      params.data.inviteId,
      query.data.publicationId,
    );
    if (!cancelled) {
      res
        .status(404)
        .json({ error: "Invite not found or already consumed" });
      return;
    }

    await recordAuditEvent({
      publicationId: query.data.publicationId,
      userId: scope.user.id,
      action: "staff.invite.cancelled",
      entityType: "staff_invite",
      entityId: params.data.inviteId,
      metadata: {},
    });

    res.json({ cancelled: true });
  },
);

export default router;
