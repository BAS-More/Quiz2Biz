/**
 * InvoicesPage - Displays billing history and invoice list
 */

import { useQuery } from '@tanstack/react-query';
import { billingApi, type Invoice } from '../../api/billing';
import { EmptyState } from '../../components/ui/EmptyState';

const STATUS_CONFIG = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  open: { label: 'Open', className: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
  void: { label: 'Void', className: 'bg-gray-100 text-gray-500' },
  uncollectible: { label: 'Uncollectible', className: 'bg-red-100 text-red-700' },
  unknown: { label: 'Unknown', className: 'bg-gray-100 text-gray-700' },
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.unknown;

  return (
    <tr className="hover:bg-gray-50" data-testid="invoice-row">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-medium text-gray-900">{invoice.stripeInvoiceId}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.className}`}>
          {status.label}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(invoice.amount, invoice.currency)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {invoice.paidAt ? formatDate(invoice.paidAt) : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDate(invoice.createdAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
        <div className="flex items-center justify-end gap-3">
          {invoice.invoiceUrl && (
            <a
              href={invoice.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              View
            </a>
          )}
          {invoice.invoicePdfUrl && (
            <a
              href={invoice.invoicePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Download PDF
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

function InvoiceEmptyState() {
  return (
    <EmptyState
      type="documents"
      title="No invoices"
      description="You don't have any invoices yet. Invoices will appear here after your first payment."
      size="sm"
    />
  );
}

export function InvoicesPage() {
  const {
    data: invoices,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => billingApi.getInvoices(50),
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Invoice History</h1>
          <p className="text-gray-500">Loading invoices...</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded w-16" />
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="flex-1" />
              <div className="h-4 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load invoices</h2>
          <p className="text-gray-500">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" data-testid="invoices-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice History</h1>
          <p className="text-gray-500">View and download your invoices</p>
        </div>
        <a href="/billing" className="text-blue-600 hover:text-blue-700 font-medium">
          ← Back to Billing
        </a>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {invoices && invoices.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issued
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </tbody>
          </table>
        ) : (
          <InvoiceEmptyState />
        )}
      </div>
    </div>
  );
}

export default InvoicesPage;
