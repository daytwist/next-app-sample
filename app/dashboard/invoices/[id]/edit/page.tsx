import Form from '@/app/ui/invoices/edit-form';
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: 'Edit Invoice',
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  const hdrs = await headers();
  const host = hdrs.get('host');
  const protocol = process.env.VERCEL ? 'https' : 'http';
  const base = `${protocol}://${host}`;
  const cookie = hdrs.get('cookie') ?? '';
  const [invoiceRes, customersRes] = await Promise.all([
    fetch(`${base}/api/invoices/${id}`, { cache: 'no-store', headers: { cookie } }),
    fetch(`${base}/api/customers`, { cache: 'no-store', headers: { cookie } }),
  ]);

  if (invoiceRes.status === 404) {
    notFound();
  }
  if (!invoiceRes.ok || !customersRes.ok) {
    throw new Error('Failed to load invoice or customers');
  }
  const invoice = await invoiceRes.json();
  const { data: customers } = await customersRes.json();

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Invoices', href: '/dashboard/invoices' },
          {
            label: 'Edit Invoice',
            href: `/dashboard/invoices/${id}/edit`,
            active: true,
          },
        ]}
      />
      <Form invoice={invoice} customers={customers} />
    </main>
  );
}
