import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/app/lib/db';
import { getClientKey, isSameOriginRequest, rateLimit, tooManyRequests } from '@/app/lib/security';

const InvoiceUpdateSchema = z.object({
  customerId: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  status: z.enum(['pending', 'paid']).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;
  try {
    const data = await sql`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status,
        invoices.date
      FROM invoices
      WHERE invoices.id = ${id}
    `;
    if (!data[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const key = `${getClientKey(req)}:invoices:PATCH`;
  const { allowed, reset } = rateLimit(key, 60, 60_000);
  if (!allowed) return tooManyRequests(reset);

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const parsed = InvoiceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }
  const fields = parsed.data;
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }
  try {
    const amountInCents = fields.amount != null ? fields.amount * 100 : undefined;
    console.info('[audit] update invoice', { by: session.user?.email, id, fields });
    await sql`
      UPDATE invoices
      SET
        customer_id = COALESCE(${fields.customerId ?? null}, customer_id),
        amount = COALESCE(${amountInCents ?? null}, amount),
        status = COALESCE(${fields.status ?? null}, status)
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const key = `${getClientKey(req)}:invoices:DELETE`;
  const { allowed, reset } = rateLimit(key, 60, 60_000);
  if (!allowed) return tooManyRequests(reset);

  const { id } = params;
  try {
    console.info('[audit] delete invoice', { by: session.user?.email, id });
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}
