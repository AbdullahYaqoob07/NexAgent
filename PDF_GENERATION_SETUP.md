# PDF Generation System - NexAgent Marketplace

## Overview

The PDF generation system creates professional transaction receipts and invoices using ReportLab, a pure Python library. Users can download transaction receipts with a single click, while the system handles the entire PDF generation process transparently. No external dependencies required!

## System Architecture

### Backend Components

1. **PDF Generator API** (`backend/app/api/v1/pdf_generator.py`)
   - Accepts transaction data via query parameters
   - Generates professional PDF using ReportLab
   - No external system dependencies
   - Returns PDF file to client

2. **ReportLab PDF Engine**
   - Professional, branded receipt design
   - NexAgent orange color scheme (#FF6900)
   - Includes buyer/seller information
   - Transaction details and pricing summary
   - Payment information section
   - Styled tables with proper formatting
   - Pure Python implementation

### Frontend Components

1. **Download Button** (Marketplace Admin > Transactions Tab)
   - Located in Actions column of transaction table
   - Triggers PDF download when clicked
   - Shows loading state during PDF generation

2. **API Integration** 
   - Fetches PDF from backend `/api/v1/pdf/transactions/receipt` endpoint
   - Handles blob download automatically
   - No manual file handling required for users

## Setup Requirements

### Prerequisites

1. **Python Packages** (Only requirement!)
   ```bash
   # Install reportlab
   pip install reportlab
   
   # Verify installation
   python -c "import reportlab; print(reportlab.__version__)"
   ```

2. **Note: No External Dependencies**
   - No LaTeX installation needed
   - No pdflatex required
   - No system-level dependencies
   - Pure Python solution = works everywhere!

## API Endpoints

### Generate Transaction Receipt

**Endpoint:** `POST /api/v1/pdf/transactions/receipt`

**Authentication:** Required (Bearer token)

**Query Parameters:**
```
- purchase_id (string, required): Unique purchase identifier
- buyer (string, required): Buyer name
- seller (string, required): Seller name
- nexa (string, required): Product/Nexa name
- amount (float, required): Transaction amount
- status (string, optional): Transaction status (default: "completed")
- date (string, optional): Transaction date (default: current date)
- category (string, optional): Product category (default: "Digital Product")
```

**Example Request:**
```bash
POST /api/v1/pdf/transactions/receipt?purchase_id=purchase-123&buyer=John%20Doe&seller=Automation%20Labs&nexa=Email%20Automator&amount=29.99&status=completed&date=2024-10-30
Authorization: Bearer <token>
```

**Response:**
- Content-Type: `application/pdf`
- File: Professional transaction receipt PDF

### Generate Transaction Invoice

**Endpoint:** `POST /api/v1/pdf/transactions/invoice`

**Same parameters as receipt endpoint**

**Response:** Identical to receipt (uses same template for now, can be customized)

## File Structure

```
backend/
├── app/
│   └── api/
│       └── v1/
│           └── pdf_generator.py          # PDF generation API
└── generated_pdfs/                       # Generated PDF storage (auto-created)
    ├── receipt_purchase-123_1704067200.pdf
    └── invoice_purchase-123_1704067200.pdf
```

## Frontend Integration

### Usage in React Component

```typescript
const downloadTransactionPDF = async (transaction) => {
  try {
    const params = new URLSearchParams({
      purchase_id: transaction.purchaseId,
      buyer: transaction.buyer,
      seller: transaction.seller,
      nexa: transaction.nexa,
      amount: transaction.amount,
      status: transaction.status,
      date: transaction.date,
    });

    const response = await fetch(
      `/api/v1/pdf/transactions/receipt?${params}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NexAgent_Receipt_${transaction.purchaseId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
  }
};
```

## PDF Design Customization

The PDF design in `create_professional_pdf()` can be easily customized:

### Colors
```python
colors.Color(1, 0.41, 0)        # NexAgent Orange #FF6900
colors.Color(0.31, 0.31, 0.31)  # Dark gray text
colors.Color(0.95, 0.95, 0.95)  # Light gray background
```

### Layout Sections
- **Header**: NexAgent title with subtitle
- **Invoice Details**: Purchase ID, date, status
- **Party Information**: Buyer and seller details
- **Transaction Details**: Item table with styling
- **Pricing Summary**: Subtotal, fees, total with orange highlight
- **Payment Information**: Method, status, transaction ID
- **Footer**: Support contact and legal notice

### Modifying Design
Edit the `create_professional_pdf()` function to change:
- `ParagraphStyle` definitions for fonts/colors
- Table column widths
- Spacing (Spacer values)
- Table styling with `TableStyle`
- Section content and order

## Performance Considerations

1. **PDF Generation Time**: 2-5 seconds per document
2. **File Size**: ~50-100 KB per PDF
3. **Concurrent Requests**: Limited by pdflatex subprocess (recommend rate limiting)
4. **Storage**: PDFs stored in `generated_pdfs/` directory

## Rate Limiting

API is rate-limited to 30 requests per minute per user to prevent abuse.

## Error Handling

### Common Issues

1. **pdflatex not found**
   - Error: `"pdflatex: command not found"`
   - Solution: Install pdflatex for your operating system

2. **LaTeX compilation failed**
   - Error: `"LaTeX compilation failed"`
   - Solution: Check LaTeX template syntax in error logs

3. **Permission denied**
   - Error: `"Permission denied creating generated_pdfs/"`
   - Solution: Ensure write permissions in application directory

4. **PDF generation timeout**
   - Error: `"LaTeX compilation timed out"`
   - Solution: Increase timeout value or optimize LaTeX template

## Security

- API requires authentication (Bearer token)
- PDF generation is logged with user ID and transaction details
- Rate limiting prevents abuse
- Generated PDFs use transient temp files, then moved to persistent storage
- No sensitive data exposed in filenames (only purchase ID)

## Future Enhancements

1. **Multi-page Invoices**: Support for bulk transaction exports
2. **Custom Branding**: User-provided logos and colors
3. **Digital Signatures**: Add certificate-based signatures to PDFs
4. **Email Integration**: Automatic receipt emailing
5. **Batch Generation**: Generate receipts for multiple transactions
6. **Archive**: Permanent receipt archive with search/retrieval
7. **OCR**: Add QR codes with transaction verification links
8. **Analytics**: Track receipt generation and download statistics

## Troubleshooting

### Check reportlab installation:
```bash
python -c "import reportlab; print(reportlab.__version__)"
```

### Test PDF generation manually:
```python
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

doc = SimpleDocTemplate("test.pdf")
styles = getSampleStyleSheet()
doc.build([Paragraph("Test PDF", styles['Heading1'])])
print("PDF created: test.pdf")
```

### Monitor logs:
```bash
# Check application logs for PDF generation errors
tail -f application.log | grep "pdf"
```

## Support

For issues or feature requests related to PDF generation:
- Check backend logs: `app/logs/`
- Review PDF generation code: `app/api/v1/pdf_generator.py`
- Verify reportlab installation: `pip install reportlab`
- Check user authentication status
- Ensure `generated_pdfs/` directory is writable
