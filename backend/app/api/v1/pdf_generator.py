from fastapi import APIRouter, HTTPException, Depends, Query, Path, Request
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import logging
import os
import tempfile
from datetime import datetime
from pathlib import Path as PathlibPath
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.graphics import renderPDF

from app.services.firebase_service import FirebaseService
from app.core.security import rate_limit
from app.core.logging import log_api_event

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(
    prefix="/pdf",
    tags=["📄 PDF Generation"],
    responses={
        400: {"description": "Bad Request"},
        401: {"description": "Unauthorized"},
        500: {"description": "Internal Server Error"}
    }
)

# Dependency for user authentication
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify user token and return user info"""
    try:
        firebase_service = FirebaseService()
        user_info = await firebase_service.verify_token(credentials.credentials)
        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user_info
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")


def create_professional_pdf(transaction_data: Dict[str, Any], output_path: str) -> bool:
    """
    Generate a professional transaction receipt PDF using ReportLab
    """
    try:
        # Create document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=50,
            leftMargin=50,
            topMargin=60,
            bottomMargin=60
        )
        
        # Define styles
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=28,
            spaceAfter=30,
            textColor=colors.Color(1, 0.41, 0),  # Orange #FF6900
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Normal'],
            fontSize=14,
            spaceAfter=30,
            textColor=colors.Color(0.31, 0.31, 0.31),  # Dark gray
            alignment=TA_CENTER,
            fontName='Helvetica'
        )
        
        header_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=14,
            spaceBefore=20,
            spaceAfter=10,
            textColor=colors.Color(0.2, 0.2, 0.2),
            fontName='Helvetica-Bold'
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.Color(0.2, 0.2, 0.2),
            fontName='Helvetica'
        )
        
        # Build document content
        content = []
        
        # Header
        content.append(Paragraph("NexAgent", title_style))
        content.append(Paragraph("Marketplace Transaction Receipt", subtitle_style))
        
        # Add horizontal line
        content.append(Spacer(1, 10))
        
        # Invoice details table
        invoice_data = [
            ['Purchase ID:', transaction_data.get('purchase_id', 'N/A'), 'Date:', transaction_data.get('date', 'N/A')],
            ['Status:', transaction_data.get('status', 'PENDING').upper(), 'Invoice Date:', datetime.now().strftime('%B %d, %Y')]
        ]
        
        invoice_table = Table(invoice_data, colWidths=[1.2*inch, 1.8*inch, 1.0*inch, 1.5*inch])
        invoice_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (1, 0), (1, 0), colors.Color(1, 0.41, 0)),
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        content.append(invoice_table)
        content.append(Spacer(1, 30))
        
        # Party information
        party_data = [
            [Paragraph('<b>Buyer Information</b>', header_style), Paragraph('<b>Seller Information</b>', header_style)],
            ['', ''],
            [f"Name: {transaction_data.get('buyer', 'N/A')}", f"Name: {transaction_data.get('seller', 'N/A')}"],
            ['Email: buyer@nexagent.com', 'Email: seller@nexagent.com'],
            ['Type: End User', 'Type: Verified Seller']
        ]
        
        party_table = Table(party_data, colWidths=[3*inch, 3*inch])
        party_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.Color(0.8, 0.8, 0.8)),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 2), (-1, -1), 8),
        ]))
        
        content.append(party_table)
        content.append(Spacer(1, 30))
        
        # Transaction details header
        content.append(Paragraph("Transaction Details", header_style))
        content.append(Spacer(1, 10))
        
        # Transaction table
        transaction_table_data = [
            ['Item', 'Category', 'Unit Price', 'Amount'],
            [transaction_data.get('nexa', 'N/A'), transaction_data.get('category', 'Digital Product'), 
             f"${transaction_data.get('amount', 0)}", f"${transaction_data.get('amount', 0)}"]
        ]
        
        transaction_table = Table(transaction_table_data, colWidths=[2.8*inch, 1.2*inch, 1.0*inch, 1.0*inch])
        transaction_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.95, 0.95, 0.95)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('GRID', (0, 0), (-1, -1), 1, colors.Color(0.8, 0.8, 0.8)),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        content.append(transaction_table)
        content.append(Spacer(1, 30))
        
        # Pricing summary
        amount = transaction_data.get('amount', 0)
        pricing_data = [
            ['Subtotal:', f'${amount}'],
            ['Platform Fee (0%):', '$0.00'],
            ['', ''],
            [Paragraph('<b>Total Amount:</b>', ParagraphStyle('Bold', parent=normal_style, textColor=colors.Color(1, 0.41, 0), fontName='Helvetica-Bold')), 
             Paragraph(f'<b>${amount}</b>', ParagraphStyle('Bold', parent=normal_style, textColor=colors.Color(1, 0.41, 0), fontName='Helvetica-Bold'))]
        ]
        
        pricing_table = Table(pricing_data, colWidths=[4*inch, 1.5*inch])
        pricing_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.Color(1, 0.41, 0)),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        content.append(pricing_table)
        content.append(Spacer(1, 30))
        
        # Payment information
        content.append(Paragraph("Payment Information", header_style))
        content.append(Spacer(1, 10))
        
        payment_data = [
            ['Payment Method:', 'Stripe Payment'],
            ['Payment Status:', transaction_data.get('status', 'PENDING').upper()],
            ['Transaction ID:', transaction_data.get('purchase_id', 'N/A')]
        ]
        
        payment_table = Table(payment_data, colWidths=[1.5*inch, 3*inch])
        payment_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (1, 1), (1, 1), colors.Color(1, 0.41, 0)),
            ('FONTNAME', (1, 1), (1, 1), 'Helvetica-Bold'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        content.append(payment_table)
        content.append(Spacer(1, 40))
        
        # Footer
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.Color(0.5, 0.5, 0.5),
            alignment=TA_CENTER,
            fontName='Helvetica'
        )
        
        content.append(Paragraph("This is an automatically generated receipt. No signature required.", footer_style))
        content.append(Spacer(1, 6))
        content.append(Paragraph("Thank you for using NexAgent Marketplace!", footer_style))
        content.append(Spacer(1, 12))
        content.append(Paragraph("For support, contact: support@nexagent.com", footer_style))
        
        # Build PDF
        doc.build(content)
        
        logger.info(f"PDF generated successfully: {output_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        return False


def generate_pdf_file(transaction_data: Dict[str, Any], output_filename: str) -> Optional[str]:
    """
    Generate PDF file using ReportLab
    Returns the path to the generated PDF file
    """
    try:
        # Create output directory if it doesn't exist
        output_dir = PathlibPath("generated_pdfs")
        output_dir.mkdir(exist_ok=True)
        
        output_path = output_dir / output_filename
        
        # Generate PDF
        success = create_professional_pdf(transaction_data, str(output_path))
        
        if success and output_path.exists():
            return str(output_path)
        else:
            return None
                
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        return None


@router.post(
    "/transactions/receipt",
    summary="Generate Transaction Receipt PDF",
    description="Generate a professional transaction receipt as PDF"
)
@rate_limit(requests_per_minute=30)
async def generate_transaction_receipt(
    request: Request,
    purchase_id: str = Query(..., description="Purchase ID"),
    buyer: str = Query(..., description="Buyer name"),
    seller: str = Query(..., description="Seller name"),
    nexa: str = Query(..., description="Nexa/Product name"),
    amount: float = Query(..., description="Transaction amount"),
    status: str = Query("completed", description="Transaction status"),
    date: str = Query(None, description="Transaction date"),
    category: str = Query("Digital Product", description="Product category"),
    current_user: dict = Depends(get_current_user)
):
    """Generate and return a professional transaction receipt PDF"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="generate_transaction_receipt",
            resource_id=purchase_id,
            metadata={"buyer": buyer, "seller": seller, "amount": amount}
        )
        
        # Prepare transaction data
        transaction_data = {
            'purchase_id': purchase_id,
            'buyer': buyer,
            'seller': seller,
            'nexa': nexa,
            'amount': amount,
            'status': status,
            'date': date or datetime.now().strftime('%B %d, %Y'),
            'category': category
        }
        
        # Generate PDF
        filename = f"receipt_{purchase_id}_{int(datetime.now().timestamp())}.pdf"
        pdf_path = generate_pdf_file(transaction_data, filename)
        
        if not pdf_path or not PathlibPath(pdf_path).exists():
            raise HTTPException(status_code=500, detail="Failed to generate PDF")
        
        # Return PDF file
        return FileResponse(
            path=pdf_path,
            filename=f"NexAgent_Receipt_{purchase_id}.pdf",
            media_type="application/pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating receipt: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate receipt PDF")


@router.post(
    "/transactions/invoice",
    summary="Generate Transaction Invoice PDF",
    description="Generate a detailed transaction invoice as PDF"
)
@rate_limit(requests_per_minute=30)
async def generate_transaction_invoice(
    request: Request,
    purchase_id: str = Query(...),
    buyer: str = Query(...),
    seller: str = Query(...),
    nexa: str = Query(...),
    amount: float = Query(...),
    status: str = Query("completed"),
    date: str = Query(None),
    category: str = Query("Digital Product"),
    current_user: dict = Depends(get_current_user)
):
    """Generate and return a detailed transaction invoice PDF"""
    try:
        await log_api_event(
            request=request,
            user_id=current_user['uid'],
            action="generate_transaction_invoice",
            resource_id=purchase_id,
            metadata={"buyer": buyer, "seller": seller, "amount": amount}
        )
        
        transaction_data = {
            'purchase_id': purchase_id,
            'buyer': buyer,
            'seller': seller,
            'nexa': nexa,
            'amount': amount,
            'status': status,
            'date': date or datetime.now().strftime('%B %d, %Y'),
            'category': category
        }
        
        filename = f"invoice_{purchase_id}_{int(datetime.now().timestamp())}.pdf"
        pdf_path = generate_pdf_file(transaction_data, filename)
        
        if not pdf_path or not PathlibPath(pdf_path).exists():
            raise HTTPException(status_code=500, detail="Failed to generate PDF")
        
        return FileResponse(
            path=pdf_path,
            filename=f"NexAgent_Invoice_{purchase_id}.pdf",
            media_type="application/pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating invoice: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate invoice PDF")
