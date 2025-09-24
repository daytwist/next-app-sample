import 'server-only';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/app/lib/db';

async function listInvoices() {
	const data = await sql`
    SELECT invoices.amount, customers.name
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE invoices.amount = 666;
  `;

	return data;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const allow = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEBUG_QUERY === '1';
    if (!allow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(await listInvoices());
  } catch (error) {
    return NextResponse.json({ error: 'Failed to run debug query' }, { status: 500 });
  }
}
