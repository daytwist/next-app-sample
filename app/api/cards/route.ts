import 'server-only';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const [invoiceCount, customerCount, statusRows] = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(invoiceCount[0].count ?? '0');
    const numberOfCustomers = Number(customerCount[0].count ?? '0');
    const totalPaidInvoices = Number(statusRows[0].paid ?? '0');
    const totalPendingInvoices = Number(statusRows[0].pending ?? '0');

    return NextResponse.json({
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}
