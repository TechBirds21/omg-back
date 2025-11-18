import emailjs from 'emailjs-com';
import { InvoiceData, getInvoiceBlob } from './invoice';

// EmailJS configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_omaguva';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_INVOICE_TEMPLATE_ID || 'template_invoice';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

interface EmailInvoiceParams {
  invoiceData: InvoiceData;
  customerEmail: string;
}

export const sendInvoiceEmail = async ({ invoiceData, customerEmail }: EmailInvoiceParams): Promise<boolean> => {
  try {
    // Initialize EmailJS if not already done
    if (EMAILJS_PUBLIC_KEY) {
      emailjs.init(EMAILJS_PUBLIC_KEY);
    }

    // Generate invoice as base64 attachment
    const invoiceBlob = getInvoiceBlob(invoiceData);
    const reader = new FileReader();
    
    return new Promise((resolve) => {
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const templateParams = {
          to_email: customerEmail,
          customer_name: invoiceData.customerName,
          order_id: invoiceData.orderId,
          order_total: `₹${invoiceData.total.toLocaleString()}`,
          order_date: new Date(invoiceData.orderDate).toLocaleDateString(),
          attachment_name: `invoice-${invoiceData.orderId}.pdf`,
          attachment_data: base64Data,
          message: `Dear ${invoiceData.customerName},\n\nThank you for your order! Please find your invoice attached.\n\nOrder Details:\n- Order ID: ${invoiceData.orderId}\n- Total Amount: ₹${invoiceData.total.toLocaleString()}\n- Order Date: ${new Date(invoiceData.orderDate).toLocaleDateString()}\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nO Maguva Team`
        };

        try {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams
          );
          resolve(true);
        } catch (error) {
          
          resolve(false);
        }
      };
      
      reader.onerror = () => {
        
        resolve(false);
      };
      
      reader.readAsDataURL(invoiceBlob);
    });
  } catch (error) {
    
    return false;
  }
};

export const isEmailConfigured = (): boolean => {
  return !!(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
};
