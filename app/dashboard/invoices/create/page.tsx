import Form from '@/app/ui/invoices/create-form';
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import { Metadata } from 'next';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: 'Create Invoice',
};

export default async function Page() {
  const hdrs = await headers();
  const host = hdrs.get('host');
  const protocol = process.env.VERCEL ? 'https' : 'http';
  const base = `${protocol}://${host}`;
  const cookie = hdrs.get('cookie') ?? '';
  const res = await fetch(`${base}/api/customers`, { cache: 'no-store', headers: { cookie } });
  if (!res.ok) throw new Error('Failed to load customers');
  const { data: customers } = await res.json();

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Invoices', href: '/dashboard/invoices' },
          {
            label: 'Create Invoice',
            href: '/dashboard/invoices/create',
            active: true,
          },
        ]}
      />
      <Form customers={customers} />
    </main>
  );
}
