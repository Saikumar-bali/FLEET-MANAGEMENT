import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { FinanceService } from '../finance/finance.service';
import { ReportsService } from './reports.service';
import type { ComplianceExpiryQuery, DateRangeQuery, ReportKeyParam } from './reports.validators';

const reportsService = new ReportsService();
const financeService = new FinanceService();

function parseQuery(req: Request): DateRangeQuery {
  return req.query as unknown as DateRangeQuery;
}

function csvHeader(key: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  return `attachment; filename="${key}-${date}.csv"`;
}

function csvOf(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    if (val == null) return '';
    let s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      s = `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(','));
  }
  return lines.join('\n');
}

export class ReportsController {
  async vehicleUtilization(req: Request, res: Response) {
    return sendSuccess(res, await reportsService.vehicleUtilization(parseQuery(req)));
  }

  async tripSummary(req: Request, res: Response) {
    return sendSuccess(res, await reportsService.tripSummary(parseQuery(req)));
  }

  async fuelSummary(req: Request, res: Response) {
    return sendSuccess(res, await reportsService.fuelSummary(parseQuery(req)));
  }

  async fuelMissingReceipts(req: Request, res: Response) {
    return sendSuccess(res, await reportsService.fuelMissingReceipts(parseQuery(req)));
  }

  async financePnl(req: Request, res: Response) {
    return sendSuccess(res, await financeService.getPnl(parseQuery(req) as any));
  }

  async complianceExpiry(req: Request, res: Response) {
    const q = req.query as unknown as ComplianceExpiryQuery;
    return sendSuccess(res, await reportsService.complianceExpiry(q));
  }

  async documentVerification(req: Request, res: Response) {
    return sendSuccess(res, await reportsService.documentVerification(parseQuery(req)));
  }

  async maintenanceSummary(req: Request, res: Response) {
    return sendSuccess(res, await reportsService.maintenanceSummary(parseQuery(req)));
  }

  async exportCsv(req: Request, res: Response) {
    const { key } = req.params as unknown as ReportKeyParam;
    const query = parseQuery(req);
    const limit = 5000;
    let csv = '';
    let rowCount = 0;

    switch (key) {
      case 'vehicle-utilization': {
        const data = await reportsService.vehicleUtilization({ ...query, limit });
        csv = csvOf(data.rows as unknown as Record<string, unknown>[]);
        rowCount = data.rows.length;
        break;
      }
      case 'trip-summary': {
        const data = await reportsService.tripSummary({ ...query, limit });
        csv = csvOf(data.rows as unknown as Record<string, unknown>[]);
        rowCount = data.rows.length;
        break;
      }
      case 'fuel-missing-receipts': {
        const data = await reportsService.fuelMissingReceipts({ ...query, limit });
        csv = csvOf(data.rows as unknown as Record<string, unknown>[]);
        rowCount = data.rows.length;
        break;
      }
      case 'compliance-expiry': {
        const q = req.query as unknown as ComplianceExpiryQuery;
        const data = await reportsService.complianceExpiry({ ...q });
        csv = csvOf(data.rows as unknown as Record<string, unknown>[]);
        rowCount = data.rows.length;
        break;
      }
      case 'document-verification': {
        const data = await reportsService.documentVerification({ ...query, limit });
        csv = csvOf(data.rows as unknown as Record<string, unknown>[]);
        rowCount = data.rows.length;
        break;
      }
      case 'maintenance-summary': {
        const data = await reportsService.maintenanceSummary({ ...query, limit });
        csv = csvOf(data.rows as unknown as Record<string, unknown>[]);
        rowCount = data.rows.length;
        break;
      }
      default:
        return res.status(404).json({ success: false, message: 'CSV export not available for this report' });
    }

    if (rowCount >= limit) {
      csv = `# Note: truncated to ${limit} rows\n${csv}`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', csvHeader(key));
    return res.status(200).send(csv);
  }
}

export const reportsController = new ReportsController();