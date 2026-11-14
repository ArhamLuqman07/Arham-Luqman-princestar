import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order } from '../types/store.ts';
import { formatPKR } from './api.ts';

export function exportToCSV(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>
) {
  const escape = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join(
    '\n'
  );
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadBrandedReportPDF(options: {
  title: string;
  dateRangeLabel: string;
  totals: Array<{ label: string; value: string }>;
  columns: string[];
  rows: Array<Array<string | number>>;
  filename: string;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, pageWidth, 84, 'F');

  doc.setTextColor(212, 175, 55);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text('PRINCE STAR', 40, 38);

  doc.setTextColor(245, 243, 238);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('LUXURY LIFESTYLE  ·  KARIANWALA, DISTRICT GUJRAT, PAKISTAN', 40, 56);
  doc.text('WhatsApp: +92 307 6817272  ·  princestar.store@gmail.com', 40, 70);

  // Report title & metadata
  doc.setTextColor(17, 17, 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(options.title, 40, 114);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Period: ${options.dateRangeLabel}`, 40, 130);
  doc.text(`Generated: ${new Date().toLocaleString('en-PK')}`, pageWidth - 40, 130, {
    align: 'right',
  });

  // Totals strip
  let cursorY = 148;
  if (options.totals.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [options.totals.map((t) => t.label)],
      body: [options.totals.map((t) => t.value)],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 8, halign: 'center' },
      headStyles: { fillColor: [245, 241, 232], textColor: [17, 17, 17], fontStyle: 'bold' },
      bodyStyles: { textColor: [17, 17, 17], fontStyle: 'bold' },
      margin: { left: 40, right: 40 },
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  }

  // Detail table
  autoTable(doc, {
    startY: cursorY,
    head: [options.columns],
    body: options.rows,
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 6 },
    headStyles: { fillColor: [17, 17, 17], textColor: [212, 175, 55], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 249, 246] },
    margin: { left: 40, right: 40 },
  });

  doc.save(options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`);
}

export function downloadOrderInvoicePDF(order: Order) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, pageWidth, 88, 'F');

  doc.setTextColor(212, 175, 55);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text('PRINCE STAR', 40, 38);

  doc.setTextColor(245, 243, 238);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('LUXURY LIFESTYLE  ·  OFFICIAL TAX & DISPATCH INVOICE', 40, 56);
  doc.text('Karianwala, District Gujrat, Pakistan  ·  +92 307 6817272', 40, 70);

  doc.setTextColor(212, 175, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`INVOICE #${order.orderNumber}`, pageWidth - 40, 42, { align: 'right' });
  doc.setTextColor(245, 243, 238);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Date: ${new Date(order.createdAt).toLocaleDateString('en-PK')}`,
    pageWidth - 40,
    58,
    { align: 'right' }
  );

  doc.setTextColor(17, 17, 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BILL & SHIP TO:', 40, 118);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(order.customerName, 40, 134);
  doc.text(`Phone: ${order.customerPhone}`, 40, 148);
  if (order.customerEmail) {
    doc.text(`Email: ${order.customerEmail}`, 40, 162);
  }
  doc.text(`${order.deliveryAddress}, ${order.city}, ${order.province}`, 40, 176, {
    maxWidth: 280,
  });

  doc.setFont('helvetica', 'bold');
  doc.text('ORDER SUMMARY:', 350, 118);
  doc.setFont('helvetica', 'normal');
  doc.text(`Order Status: ${order.orderStatus}`, 350, 134);
  doc.text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, 350, 148);
  doc.text(`Payment Status: ${order.paymentStatus.replace(/_/g, ' ').toUpperCase()}`, 350, 162);
  if (order.courierName || order.trackingNumber) {
    doc.text(
      `Courier: ${order.courierName || 'Standard'} (${order.trackingNumber || 'Pending'})`,
      350,
      176
    );
  }

  const rows = (order.items || []).map((item) => [
    item.sku,
    `${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''}`,
    item.quantity,
    formatPKR(item.unitPrice),
    formatPKR(item.lineTotal),
  ]);

  autoTable(doc, {
    startY: 210,
    head: [['SKU', 'Item & Variant', 'Qty', 'Unit Price', 'Line Total']],
    body: rows,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 7 },
    headStyles: { fillColor: [17, 17, 17], textColor: [212, 175, 55] },
    margin: { left: 40, right: 40 },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Subtotal: ${formatPKR(order.subtotal)}`, pageWidth - 40, finalY, { align: 'right' });
  if (order.discountAmount > 0) {
    doc.text(
      `Discount${order.couponCode ? ` (${order.couponCode})` : ''}: -${formatPKR(order.discountAmount)}`,
      pageWidth - 40,
      finalY + 16,
      { align: 'right' }
    );
  }
  doc.text(
    `Shipping: ${order.shippingCost === 0 ? 'Complimentary' : formatPKR(order.shippingCost)}`,
    pageWidth - 40,
    finalY + 32,
    { align: 'right' }
  );
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL PAYABLE: ${formatPKR(order.totalAmount)}`, pageWidth - 40, finalY + 54, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  doc.text(
    'Thank you for choosing PRINCE STAR — LUXURY LIFESTYLE. For assistance, WhatsApp +92 307 6817272.',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 36,
    { align: 'center' }
  );

  doc.save(`PRINCE-STAR-Invoice-${order.orderNumber}.pdf`);
}
