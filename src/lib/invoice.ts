// @ts-nocheck
import jsPDF from 'jspdf';

export interface InvoiceData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    image?: string;
    colors?: string[];
    sizes?: string[];
    sareeId?: string;
  }>;
  subtotal: number;
  total: number;
  paymentMethod: string;
  transactionId?: string;
  paymentStatus?: string;
  orderDate: string;
  paymentGatewayResponse?: any;
  productImages?: string[];
  coverImageIndex?: number;
}

export const generateInvoicePDF = (invoiceData: InvoiceData, options?: { logoDataUrl?: string }): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const logoDataUrl = options?.logoDataUrl;

  // Normalize fields to avoid runtime errors
  const safeOrderId = String(invoiceData.orderId || 'ORDER');
  const safeOrderDate = invoiceData.orderDate ? new Date(invoiceData.orderDate).toLocaleDateString() : new Date().toLocaleDateString();
  const safeCustomerName = String(invoiceData.customerName || 'Customer');
  const safeCustomerPhone = String(invoiceData.customerPhone || '');
  const safePaymentMethod = String(invoiceData.paymentMethod || 'Online Payment');
  const safePaymentStatus = String(invoiceData.paymentStatus || 'PAID');
  const safeTransactionId = invoiceData.transactionId ? String(invoiceData.transactionId) : '';
  const shipping = String(invoiceData.shippingAddress || 'Address on file');

  // Traditional Indian saree brand colors
  const primaryColor: [number, number, number] = [139, 69, 19]; // Saddle Brown
  const accentColor: [number, number, number] = [218, 165, 32]; // Goldenrod
  const creamColor: [number, number, number] = [255, 253, 208]; // Cream background

  // Header with traditional design
  // Cream background
  doc.setFillColor(creamColor[0], creamColor[1], creamColor[2]);
  doc.rect(0, 0, pageWidth, 80, 'F');

  // Decorative border
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(2);
  doc.rect(margin/2, margin/2, pageWidth - margin, 80 - margin, 'S');

  // Golden accent line
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(1);
  doc.line(margin, 15, pageWidth - margin, 15);

  let currentY = 25;

  // Logo prominently displayed
  if (logoDataUrl) {
    try {
      let format: 'PNG' | 'JPEG' = 'PNG';
      if (/^data:image\/jpeg|^data:image\/jpg/i.test(logoDataUrl)) format = 'JPEG';
      doc.addImage(logoDataUrl, format as any, margin, currentY, 30, 12);
    } catch (error) {
      
    }
  }

  // Company name in traditional style
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('O Maguva', margin + (logoDataUrl ? 35 : 0), currentY + 5);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);
  doc.text('Traditional Sarees & Clothing', margin + (logoDataUrl ? 35 : 0), currentY + 12);

  // Tagline
  doc.setFontSize(10);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text('Timeless Elegance • Authentic Craftsmanship', margin + (logoDataUrl ? 35 : 0), currentY + 18);

  // Invoice title with decorative element
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('TAX INVOICE', pageWidth - margin - 50, currentY + 8);

  // Invoice details in styled box
  const detailsBoxY = currentY + 25;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.roundedRect(pageWidth - margin - 85, detailsBoxY, 80, 30, 3, 3, 'FD');

  // Golden border
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth - margin - 85, detailsBoxY, 80, 30, 3, 3, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Invoice No:', pageWidth - margin - 80, detailsBoxY + 8);
  doc.text('Date:', pageWidth - margin - 80, detailsBoxY + 16);
  doc.text('Txn ID:', pageWidth - margin - 80, detailsBoxY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);
  doc.text(safeOrderId, pageWidth - margin - 40, detailsBoxY + 8);
  doc.text(safeOrderDate, pageWidth - margin - 40, detailsBoxY + 16);
  doc.text(safeTransactionId.substring(0, 12), pageWidth - margin - 40, detailsBoxY + 24);

  currentY = detailsBoxY + 40;
  
  // Customer details section with traditional styling
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Bill To:', margin, currentY);

  currentY += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);

  // Customer name
  doc.setFont('helvetica', 'bold');
  doc.text(safeCustomerName, margin, currentY);
  currentY += 6;

  // Customer phone
  if (safeCustomerPhone) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text(`Phone: ${safeCustomerPhone}`, margin, currentY);
    currentY += 6;
  }

  // Shipping address
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);
  const addressLines = doc.splitTextToSize(`Shipping Address: ${shipping}`, 80);
  doc.text(addressLines, margin, currentY);

  // Payment info on the right
  const paymentInfoX = pageWidth - margin - 80;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Payment Details:', paymentInfoX, currentY - 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);
  doc.text(`Method: ${safePaymentMethod}`, paymentInfoX, currentY - 6);
  doc.text(`Status: ${safePaymentStatus}`, paymentInfoX, currentY);
  if (safeTransactionId) {
    doc.text(`Txn ID: ${safeTransactionId}`, paymentInfoX, currentY + 6);
  }

  currentY += Math.max(addressLines.length * 5, 15) + 10;

  // Items table with enhanced styling for multiple items
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Order Details:', margin, currentY);
  currentY += 8;

  // Table header with traditional styling
  const tableStartY = currentY;
  const tableWidth = pageWidth - 2 * margin;
  const colWidths = [tableWidth * 0.08, tableWidth * 0.12, tableWidth * 0.35, tableWidth * 0.12, tableWidth * 0.15, tableWidth * 0.18]; // S.No, Image, Item, Qty, Price, Total

  // Header background
  doc.setFillColor(creamColor[0], creamColor[1], creamColor[2]);
  doc.rect(margin, tableStartY - 2, tableWidth, 10, 'F');

  // Header border
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.8);
  doc.rect(margin, tableStartY - 2, tableWidth, 10, 'S');

  // Golden accent line
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, tableStartY - 2, pageWidth - margin, tableStartY - 2);

  // Header text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  let headerX = margin + 5;
  doc.text('S.No', headerX, tableStartY + 4);
  headerX += colWidths[0];
  doc.text('Image', headerX, tableStartY + 4);
  headerX += colWidths[1];
  doc.text('Item Description', headerX, tableStartY + 4);
  headerX += colWidths[2];
  doc.text('Qty', headerX, tableStartY + 4);
  headerX += colWidths[3];
  doc.text('Price', headerX, tableStartY + 4);
  headerX += colWidths[4];
  doc.text('Total', headerX, tableStartY + 4);

  currentY = tableStartY + 12;

  // Items rows
  let totalAmount = 0;
  const items = invoiceData.items || [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    
    const itemName = String(item.name || 'Item');
    const itemQty = Number(item.quantity) || 1;
    const itemPrice = Number(item.price) || 0;
    const itemTotal = itemQty * itemPrice;
    totalAmount += itemTotal;

    // Check if we need a new page
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = margin + 20;

      // Repeat header on new page
      doc.setFillColor(creamColor[0], creamColor[1], creamColor[2]);
      doc.rect(margin, currentY - 2, tableWidth, 10, 'F');
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.8);
      doc.rect(margin, currentY - 2, tableWidth, 10, 'S');
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, currentY - 2, pageWidth - margin, currentY - 2);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      let headerX2 = margin + 5;
      doc.text('S.No', headerX2, currentY + 4);
      headerX2 += (colWidths[0] || 0);
      doc.text('Image', headerX2, currentY + 4);
      headerX2 += (colWidths[1] || 0);
      doc.text('Item Description', headerX2, currentY + 4);
      headerX2 += (colWidths[2] || 0);
      doc.text('Qty', headerX2, currentY + 4);
      headerX2 += (colWidths[3] || 0);
      doc.text('Price', headerX2, currentY + 4);
      headerX2 += (colWidths[4] || 0);
      doc.text('Total', headerX2, currentY + 4);

      currentY += 12;
    }

    // Row background (alternating)
    if (i % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(252, 252, 252);
    }
    doc.rect(margin, currentY - 2, tableWidth, 8, 'F');

    // Row border
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.rect(margin, currentY - 2, tableWidth, 8, 'S');

    // Item data
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    let itemX = margin + 5;
    doc.text(String(i + 1), itemX, currentY + 3);
    itemX += (colWidths[0] || 0);

    // Add small product image if available
    if (item.image) {
      try {
        // Try to add image (small thumbnail)
        doc.addImage(item.image, 'JPEG', itemX + 2, currentY - 1, 8, 8);
      } catch (imgError) {
        // If image fails, just leave space
        
      }
    }
    itemX += (colWidths[1] || 0);

    // Item name (with text wrapping) - include color and size details
    let fullItemName = itemName;
    const itemColors = Array.isArray(item.colors) ? item.colors : (item.colors ? [item.colors] : []);
    const itemSizes = Array.isArray(item.sizes) ? item.sizes : (item.sizes ? [item.sizes] : []);
    
    if (itemColors.length > 0) {
      fullItemName += `\nColor: ${itemColors.join(', ')}`;
    }
    if (itemSizes.length > 0) {
      fullItemName += `\nSize: ${itemSizes.join(', ')}`;
    }
    
    const itemNameLines = doc.splitTextToSize(fullItemName, (colWidths[2] || 0) - 5);
    doc.text(itemNameLines, itemX, currentY + 3);
    itemX += (colWidths[2] || 0);

    doc.text(String(itemQty), itemX, currentY + 3);
    itemX += (colWidths[3] || 0);
    doc.text(`₹${itemPrice.toFixed(2)}`, itemX, currentY + 3);
    itemX += (colWidths[4] || 0);
    doc.text(`₹${itemTotal.toFixed(2)}`, itemX, currentY + 3);

    currentY += Math.max(itemNameLines.length * 4, 12) + 2;
  }

  // Table bottom border
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY - 2, pageWidth - margin, currentY - 2);

  currentY += 10;
  
  // Order Summary with traditional styling
  const summaryX = pageWidth - margin - 80;
  const summaryWidth = 70;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Order Summary', summaryX, currentY);

  // Summary box with traditional styling
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.8);
  doc.setFillColor(creamColor[0], creamColor[1], creamColor[2]);
  doc.roundedRect(summaryX, currentY + 5, summaryWidth, 45, 3, 3, 'FD');

  // Golden border
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(summaryX + 2, currentY + 7, summaryWidth - 4, 41, 2, 2, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);

  let summaryY = currentY + 17;
  doc.text('Subtotal:', summaryX + 5, summaryY);
  doc.text(`₹${totalAmount.toFixed(2)}`, summaryX + summaryWidth - 10, summaryY, { align: 'right' });

  summaryY += 8;
  doc.text('Shipping:', summaryX + 5, summaryY);
  doc.text('FREE', summaryX + summaryWidth - 10, summaryY, { align: 'right' });

  // Decorative separator
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(1);
  doc.line(summaryX + 8, summaryY + 4, summaryX + summaryWidth - 8, summaryY + 4);

  summaryY += 12;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Total Amount:', summaryX + 5, summaryY);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]); // Golden color for total
  doc.setFontSize(10);
  doc.text(`₹${totalAmount.toFixed(2)}`, summaryX + summaryWidth - 10, summaryY, { align: 'right' });

  currentY += 60;

  // Payment Information with traditional styling
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Payment Information', margin, currentY);

  // Payment info with traditional styling
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.8);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, currentY + 5, pageWidth - 2 * margin, 35, 3, 3, 'FD');

  // Golden border
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 2, currentY + 7, pageWidth - 2 * margin - 4, 31, 2, 2, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);

  let paymentY = currentY + 17;
  doc.text(`Payment Method: ${safePaymentMethod}`, margin + 8, paymentY);

  if (safeTransactionId) {
    paymentY += 8;
    doc.text(`Transaction ID: ${safeTransactionId}`, margin + 8, paymentY);
  }

  paymentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(`Payment Status: ${safePaymentStatus}`, margin + 8, paymentY);

  currentY = paymentY + 25;
  
  // Traditional Footer with saree brand styling
  const footerY = pageHeight - 45;

  // Footer accent bar with golden color
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, footerY - 8, pageWidth, 6, 'F');

  // Footer background with cream color
  doc.setFillColor(creamColor[0], creamColor[1], creamColor[2]);
  doc.rect(0, footerY - 2, pageWidth, 45, 'F');

  // Decorative border
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(1);
  doc.rect(0, footerY - 2, pageWidth, 45, 'S');

  // Thank you message with traditional styling
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Thank you for choosing O Maguva!', pageWidth / 2, footerY + 8, { align: 'center' });

  // Decorative line with golden color
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 50, footerY + 12, pageWidth / 2 + 50, footerY + 12);

  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text('Timeless Elegance • Authentic Craftsmanship', pageWidth / 2, footerY + 18, { align: 'center' });

  // Contact information
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);
  doc.text('For any queries, contact us at support@omaguva.com or +91 7680041607', pageWidth / 2, footerY + 26, { align: 'center' });

  // Website
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Visit us at www.omaguva.com for more beautiful sarees', pageWidth / 2, footerY + 32, { align: 'center' });

  // Company contact details
  doc.setFontSize(7);
  doc.setTextColor(153, 153, 153);
  doc.text('Email: support@omaguva.com | Phone: +91 7680041607 | Website: omaguva.com', pageWidth / 2, footerY + 38, { align: 'center' });

  return doc;
};

export const downloadInvoice = (invoiceData: InvoiceData, options?: { logoDataUrl?: string }) => {
  try {
    const doc = generateInvoicePDF(invoiceData, options);
    // Primary path: use jsPDF's built-in save
    try {
      // Some environments may throw; guard with typeof check
      if (typeof (doc as any).save === 'function') {
        (doc as any).save(`invoice-${invoiceData.orderId}.pdf`);
        return;
      }
    } catch (_) {
      // Fall through to blob download
    }

    // Fallback: create a Blob and trigger an <a download> click
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceData.orderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1000);
  } catch (error) {
    
    throw new Error('Failed to generate invoice PDF');
  }
};

export const getInvoiceBlob = (invoiceData: InvoiceData, options?: { logoDataUrl?: string }): Blob => {
  const doc = generateInvoicePDF(invoiceData, options);
  return doc.output('blob');
};
