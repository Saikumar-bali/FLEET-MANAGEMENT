import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { generateAlerts } from './alert-generator.service';
import { getAlertSummary } from './alerts-summary.service';
import {
  bulkResolve,
  dismissAlert,
  getAlert,
  getAlertRule,
  listAlertRules,
  listAlerts,
  markRead,
  resolveAlert,
  updateAlertRule,
  type AlertScope,
} from './alerts.service';
import {
  BulkResolveInput,
  GenerateAlertsInput,
  ListAlertsQuery,
  ListAlertRulesQuery,
  UpdateAlertRuleInput,
} from './alerts.validators';

function scopeOf(req: Request): AlertScope {
  const user = req.authUser;
  return {
    roleKey: user?.role?.key ?? null,
    userDriverId: (user as any)?.userDriverId ?? null,
  };
}

function pageOf(req: Request, defaultLimit = 20) {
  return {
    page: Number(req.query.page) || 1,
    limit: Math.min(Number(req.query.limit) || defaultLimit, 100),
  };
}

export async function listAlertsController(req: Request, res: Response) {
  const query = req.query as unknown as ListAlertsQuery;
  return sendSuccess(res, await listAlerts(scopeOf(req), query));
}

export async function getAlertController(req: Request, res: Response) {
  const alert = await getAlert(scopeOf(req), String(req.params.id));
  return sendSuccess(res, alert);
}

export async function getAlertSummaryController(req: Request, res: Response) {
  return sendSuccess(res, await getAlertSummary(scopeOf(req)));
}

export async function generateAlertsController(req: Request, res: Response) {
  const input = (req.body ?? {}) as GenerateAlertsInput;
  const result = await generateAlerts(Boolean(input.dryRun));
  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'alert.generate',
    entityType: 'alert_run',
    entityId: null,
    metadata: { scanned: result.scanned, created: result.created, skipped: result.skipped, dryRun: result.dryRun },
  });
  return sendSuccess(res, result, 'Alert generation completed');
}

export async function readAlertController(req: Request, res: Response) {
  const updated = await markRead(scopeOf(req), String(req.params.id), req.authUser?.id ?? '');
  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'alert.read',
    entityType: 'alert',
    entityId: updated.id,
  });
  return sendSuccess(res, updated, 'Alert marked as read');
}

export async function resolveAlertController(req: Request, res: Response) {
  const updated = await resolveAlert(scopeOf(req), String(req.params.id), req.authUser?.id ?? '');
  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'alert.resolve',
    entityType: 'alert',
    entityId: updated.id,
  });
  return sendSuccess(res, updated, 'Alert resolved');
}

export async function dismissAlertController(req: Request, res: Response) {
  const updated = await dismissAlert(scopeOf(req), String(req.params.id), req.authUser?.id ?? '');
  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'alert.dismiss',
    entityType: 'alert',
    entityId: updated.id,
  });
  return sendSuccess(res, updated, 'Alert dismissed');
}

export async function bulkResolveController(req: Request, res: Response) {
  const input = req.body as BulkResolveInput;
  const result = await bulkResolve(scopeOf(req), input, req.authUser?.id ?? '');
  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: `alert.bulk_${input.action}`,
    entityType: 'alert',
    entityId: null,
    metadata: { ids: input.ids, updated: result.updated },
  });
  return sendSuccess(res, result, `${result.updated} alerts updated`);
}

export async function listAlertRulesController(req: Request, res: Response) {
  const query = req.query as unknown as ListAlertRulesQuery;
  const page = pageOf(req, 50);
  return sendSuccess(res, await listAlertRules({ ...query, ...page }));
}

export async function getAlertRuleController(req: Request, res: Response) {
  return sendSuccess(res, await getAlertRule(String(req.params.id)));
}

export async function updateAlertRuleController(req: Request, res: Response) {
  const input = req.body as UpdateAlertRuleInput;
  const updated = await updateAlertRule(String(req.params.id), input);
  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'alert_rule.update',
    entityType: 'alert_rule',
    entityId: updated.id,
    metadata: input as Record<string, unknown>,
  });
  return sendSuccess(res, updated, 'Alert rule updated');
}