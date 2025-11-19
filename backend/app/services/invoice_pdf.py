"""
PDF Invoice Generation Service
Creates professional invoices in PDF format
"""

from typing import Dict, Any, Optional
from datetime import datetime
import os
from pathlib import Path

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    print("⚠️  reportlab not installed. PDF generation will be disabled.")


class InvoicePDFService:
    """Service for generating PDF invoices."""
    
    def __init__(self):
        self.output_dir = Path("invoices")
        self.output_dir.mkdir(exist_ok=True)
    
    def is_available(self) -> bool:
        """Check if PDF generation is available."""
        return REPORTLAB_AVAILABLE
    
    def generate_invoice_pdf(
        self,
        bill_data: Dict[str, Any],
        items: list[Dict[str, Any]]
    ) -> Optional[str]:
        """Generate PDF invoice and return file path."""
        if not self.is_available():
            print("⚠️  PDF generation not available (reportlab not installed)")
            return None
        
        try:
            bill_number = bill_data.get("bill_number", "UNKNOWN")
            filename = f"invoice_{bill_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            filepath = self.output_dir / filename
            
            # Create PDF
            doc = SimpleDocTemplate(
                str(filepath),
                pagesize=A4,
                rightMargin=0.5*inch,
                leftMargin=0.5*inch,
                topMargin=0.5*inch,
                bottomMargin=0.5*inch
            )
            
            # Container for PDF elements
            elements = []
            styles = getSampleStyleSheet()
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#F59E0B'),  # Gold color
                spaceAfter=30,
                alignment=TA_CENTER
            )
            elements.append(Paragraph("OMAGUVA STORE", title_style))
            elements.append(Paragraph("INVOICE", title_style))
            elements.append(Spacer(1, 0.3*inch))
            
            # Bill Info
            bill_info_data = [
                ['Bill Number:', bill_number],
                ['Date:', datetime.fromisoformat(bill_data.get("created_at", datetime.now().isoformat())).strftime('%d %B %Y')],
                ['Payment Method:', bill_data.get("payment_method", "Cash").upper()],
            ]
            bill_info_table = Table(bill_info_data, colWidths=[2*inch, 3*inch])
            bill_info_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ]))
            elements.append(bill_info_table)
            elements.append(Spacer(1, 0.2*inch))
            
            # Customer Info
            customer_style = ParagraphStyle(
                'CustomerInfo',
                parent=styles['Normal'],
                fontSize=11,
                spaceAfter=10
            )
            elements.append(Paragraph("<b>Bill To:</b>", customer_style))
            elements.append(Paragraph(bill_data.get("customer_name", ""), customer_style))
            if bill_data.get("customer_phone"):
                elements.append(Paragraph(f"Phone: {bill_data.get('customer_phone')}", customer_style))
            if bill_data.get("customer_email"):
                elements.append(Paragraph(f"Email: {bill_data.get('customer_email')}", customer_style))
            if bill_data.get("customer_address"):
                elements.append(Paragraph(bill_data.get("customer_address"), customer_style))
            elements.append(Spacer(1, 0.3*inch))
            
            # Items Table - Enhanced with colors and sizes
            table_data = [['Item Description', 'Qty', 'Unit Price', 'Discount', 'Total']]
            for item in items:
                # Build item description with color and size
                item_desc = item.get("product_name", "")
                if item.get("color"):
                    item_desc += f"\nColor: {item.get('color')}"
                if item.get("size"):
                    item_desc += f"\nSize: {item.get('size')}"
                if item.get("product_sku"):
                    item_desc += f"\nSKU: {item.get('product_sku')}"
                
                table_data.append([
                    item_desc,
                    str(item.get("quantity", 0)),
                    f"₹{item.get('unit_price', 0):.2f}",
                    f"₹{item.get('discount_amount', 0):.2f}",
                    f"₹{item.get('line_total', 0):.2f}"
                ])
            
            items_table = Table(table_data, colWidths=[3.5*inch, 0.7*inch, 1*inch, 1*inch, 1*inch])
            items_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F59E0B')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
            ]))
            elements.append(items_table)
            elements.append(Spacer(1, 0.3*inch))
            
            # Summary
            subtotal = bill_data.get("subtotal", 0)
            discount = bill_data.get("discount_amount", 0)
            tax = bill_data.get("tax_amount", 0)
            total = bill_data.get("total_amount", 0)
            
            summary_data = [
                ['Subtotal:', f"₹{subtotal:.2f}"],
                ['Discount:', f"-₹{discount:.2f}"],
                ['Tax:', f"₹{tax:.2f}"],
                ['TOTAL:', f"₹{total:.2f}"]
            ]
            summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
            summary_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (0, -2), 'Helvetica'),
                ('FONTNAME', (0, -1), (1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (1, -1), 14),
                ('TEXTCOLOR', (0, -1), (1, -1), colors.HexColor('#F59E0B')),
                ('LINEBELOW', (0, -2), (1, -2), 1, colors.grey),
            ]))
            elements.append(summary_table)
            elements.append(Spacer(1, 0.5*inch))
            
            # Footer
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.grey,
                alignment=TA_CENTER
            )
            elements.append(Paragraph("Thank you for shopping with us!", footer_style))
            elements.append(Paragraph("Omaguva Store - Timeless Elegance", footer_style))
            
            # Build PDF
            doc.build(elements)
            
            print(f"✅ Invoice PDF generated: {filepath}")
            return str(filepath)
            
        except Exception as e:
            print(f"❌ Error generating PDF: {e}")
            import traceback
            traceback.print_exc()
            return None


# Global PDF service instance
invoice_pdf_service = InvoicePDFService()

