import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/app/lib/db';
import { getClientKey, isSameOriginRequest, rateLimit, tooManyRequests } from '@/app/lib/security';

const ITEMS_PER_PAGE = 6;

const InvoiceCreateSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive(),
  status: z.enum(['pending', 'paid']),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const offset = (page - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await sql`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${q}%`} OR
        customers.email ILIKE ${`%${q}%`} OR
        invoices.amount::text ILIKE ${`%${q}%`} OR
        invoices.date::text ILIKE ${`%${q}%`} OR
        invoices.status ILIKE ${`%${q}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    const countRows = await sql`
      SELECT COUNT(*)
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${q}%`} OR
        customers.email ILIKE ${`%${q}%`} OR
        invoices.amount::text ILIKE ${`%${q}%`} OR
        invoices.date::text ILIKE ${`%${q}%`} OR
        invoices.status ILIKE ${`%${q}%`}
    `;
    const total = Number(countRows[0].count ?? '0');
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    return NextResponse.json({ data: invoices, page, totalPages });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // CSRF best-effort: require same-origin if Origin header exists
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Rate limit modifications per IP
  const key = `${getClientKey(req)}:invoices:POST`;
  const { allowed, reset } = rateLimit(key, 30, 60_000);
  if (!allowed) return tooManyRequests(reset);

  const body = await req.json().catch(() => ({}));
  const parsed = InvoiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }
  const { customerId, amount, status } = parsed.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    console.info('[audit] create invoice', {
      by: session.user?.email,
      customerId,
      amount: amountInCents,
      status,
    });
    const rows = await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      RETURNING id
    `;
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
