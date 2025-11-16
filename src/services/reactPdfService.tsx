import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { ToWords } from 'to-words';

import { useToast } from '@/hooks/use-toast';
import type { Quotation } from '@/api/quotationApi';
import type { Business } from '@/api/businessApi';

// Polyfill for Buffer in browser environment (typesafe no-op)
declare global {
  interface Window { Buffer?: any }
}
if (typeof window !== 'undefined' && !(window as any).Buffer) {
  (window as any).Buffer = {
    from: (str: string) => new TextEncoder().encode(str),
    alloc: (size: number) => new Uint8Array(size),
  } as any;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 120, // Space for header
    paddingHorizontal: 30,
    paddingBottom: 80, // Increased space for footer
    backgroundColor: 'white',
    position: 'relative',
  },
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '-4%',
    width: 700,
    height: 'auto',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    opacity: 0.1,
  },
  // FIXED HEADER STYLES
  headerFixed: {
    position: 'absolute',
    top: 20,
    left: 30,
    right: 30,
    height: 100,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  companyLogoGSTINSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    borderBottom: '1px solid black',
  },
  companyLogo: {
    width: 100,
    height: 'auto',
  },
  companySection: {
    flex: 1,
  },
  companyTagline: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  addressSection: {
    textAlign: 'left',
    fontSize: 10,
  },
  gstinInfo: {
    marginBottom: 8,
  },
  addressInfo: {
    lineHeight: 0.75,
  },
  // FIXED FOOTER STYLES
  footerFixed: {
    position: 'absolute',
    bottom: 26,
    left: 30,
    right: 30,
    fontSize: 9,
  },
  footerAddress: {
    fontFamily: 'Helvetica-Bold',
  },
  footerContact: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerDate: {
    fontSize: 8,
  },
  // MAIN CONTENT STYLES
  mainContent: {
    // This will automatically flow across pages
  },
  quotationTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    margin: '4 0',
    marginBottom: 10,
    marginTop: -7,
  },
  quotationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 3,
    fontSize: 10,
  },
  metaLeft: {
    lineHeight: 0.94,
    textTransform: 'uppercase',
  },
  metaRight: {
    textAlign: 'left',
  },
  customerSection: {
    marginBottom: 15,
    fontSize: 10,
  },
  subjectLine: {
    marginBottom: 10,
  },
  greeting: {
    marginTop: 8,
    lineHeight: 0.82,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#74b4d4',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    border: '1px solid black',
    borderRight: 'none',
  },
  tableRow: {
    flexDirection: 'row',
    fontSize: 9,
    border: '1px solid black',
    borderTop: 'none',
    borderRight: 'none',
    minHeight: 22,
  },
  productCol: {
    width: '42%',
    paddingRight: 4,
    textAlign: 'center',
    borderRight: '1px solid black',
    padding: 4,
  },
  qtyCol: {
    width: '10%',
    textAlign: 'center',
    borderRight: '1px solid black',
    padding: 4,
  },
  priceCol: {
    width: '15%',
    textAlign: 'center',
    borderRight: '1px solid black',
    padding: 4,
  },
  gstCol: {
    width: '18%',
    textAlign: 'center',
    borderRight: '1px solid black',
    padding: 4,
  },
  totalCol: {
    width: '15%',
    textAlign: 'center',
    borderRight: '1px solid black',
    padding: 4,
  },
  productName: {
    marginBottom: 2,
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  productDesc: {
    fontSize: 8,
    color: '#666',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  totalsSection: {
    marginBottom: 16,
  },
  totalsTableHidden: {
    display: 'none',
    width: '66.91%',
  },
  totalsTable: {
    width: '33.09%',
    marginLeft: 'auto',
    borderLeft: '1px solid black',
  },
  totalRow: {
    flexDirection: 'row',
  },
  totalLabel: {
    padding: 4,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    backgroundColor: '#f5f5f5',
    width: '54.54%',
    borderRight: '1px solid black',
    borderBottom: '1px solid black',
  },
  totalAmount: {
    width: '45.45%',
    padding: 4,
    fontSize: 9,
    textAlign: 'right',
    borderRight: '1px solid black',
    borderBottom: '1px solid black',
  },
  grandTotalRow: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  totalWrittenInWords: {
    marginBottom: 14,
  },
  totalWrittenInWordsText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  termsSection: {
    marginBottom: 2,
  },
  termsTitle: {
    backgroundColor: '#02f72b',
    color: 'black',
    padding: 4,
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    textDecoration: 'underline',
  },
  termsContent: {
    backgroundColor: '#02f72b',
    alignSelf: 'flex-start',
    color: 'black',
    fontSize: 11,
    lineHeight: 1.4,
    marginBottom: 10,
  },
  backAndSignature: {
    marginTop: 25,
    fontSize: 10,
  },
  bankAndSignatureDetails: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    lineHeight: 0.82
  },
  signature: {
    width: 150,
    height: 'auto',
  },
});

interface QuotationDocumentProps {
  quotation: Quotation;
  business?: Business;
}

const QuotationDocument: React.FC<QuotationDocumentProps> = ({ quotation }) => {
  const formatCurrencyToWords = (amount: number) => {
    try {
      const toWords = new ToWords({
        localeCode: "en-IN",
      });
      const words = toWords.convert(Number(amount)) + ' Rupees Only';
      return words.charAt(0).toUpperCase() + words.slice(1);
    } catch (error) {
      console.error('Error converting to words:', error);
      return `${amount} Rupees Only`;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return new Date().toLocaleDateString('en-GB');
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return new Date().toLocaleDateString('en-GB');
    }
  };

  // Calculate totals
  const subtotal = quotation.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 70000;
  const taxTotal = quotation.items?.reduce((sum: number, item: any) => sum + (item.gstAmount || 0), 0) || 12600;
  const shippingCost = quotation.shippingCost || 0;
  const shippingTax = quotation.shippingTax || 0;
  const additionalChargesTotal = quotation.additionalCharges?.reduce((sum: number, charge: any) => sum + (charge.amount || 0), 0) || 0;
  const grandTotal = subtotal + taxTotal + shippingCost + shippingTax + additionalChargesTotal;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* FIXED HEADER - This will appear on every page */}
        <View style={styles.headerFixed} fixed>
          <View style={styles.companyLogoGSTINSection}>
            <View>
              <Image src='/vinayak_enterprise_logo.png' style={styles.companyLogo} />
            </View>
            <View>
              <Text>GSTIN NO: 21HCGPS1097Q2ZV</Text>
            </View>
          </View>
          <View style={styles.headerTop}>
            <View style={styles.companySection}>
              <Text style={styles.companyTagline}>MANUFACTURER & SUPPLIER OF</Text>
              <Text style={styles.companyTagline}>ALL TYPES OF DISPOSABLE PRODUCTS</Text>
              <Text style={styles.companyTagline}>MAKING MACHINE</Text>
            </View>
            <View style={styles.addressSection}>
              <View style={styles.addressInfo}>
                {/* <Text>{business?.address?.split(',')[0] || 'Plot No: 546/1960 Near Mo bus'}</Text>
                <Text>{business?.address?.split(',')[1] || 'stand, Patia Station road,'}</Text>
                <Text>{business?.address?.split(',')[2] || 'Bhubaneswar, 751024'}</Text>
                <Text>Ph: {business?.phone?.[0] || '7978608969,7205311711'}</Text> */}
                <Text>Plot No: 546/1960, Near Mo bus depot</Text>
                <Text>Patia Station Rd, Bhubaneswar, 751024</Text>
                <Text>Ph: 7205311711, 9124043711</Text>
              </View>
            </View>
          </View>
        </View>

        {/* FIXED FOOTER - This will appear on every page */}
        <View style={styles.footerFixed} fixed>
          <Text style={styles.footerAddress}>
            Plot No: 546/1960, Near Mo bus depot, Patia Station Rd, Bhubaneswar- 751024, Khurdha, Odisha
          </Text>
          <View style={styles.footerContact}>
            <View>
              <Text>
                <Text style={{ fontWeight: 'bold' }}>Mail Id:</Text> -info@myvinayakindustries.in, www.myvinayakindustries.com
              </Text>
            </View>
            <View>
              <Text style={styles.footerDate}>
                {formatDate(new Date().toISOString())}
              </Text>
            </View>
          </View>
        </View>

        {/* WATERMARK */}
        <Image src='/vinayak_enterprise_logo.png' style={styles.watermark} fixed />

        {/* MAIN CONTENT - This will automatically flow across pages */}
        <View style={styles.mainContent}>
          {/* Quotation Title */}
          <Text style={styles.quotationTitle}>
            {quotation.quotationTitle || `QUOTATION FOR ${quotation.items?.[0]?.productName?.toUpperCase() || 'MACHINE'}`}
          </Text>

          {/* Quotation Meta */}
          <View style={styles.quotationMeta}>
            <View style={styles.metaLeft}>
              <Text>To,</Text>
              <Text>
                {quotation.customer?.name || 'CUSTOMER NAME'},
              </Text>
              <Text>{quotation.customer?.address || 'Customer Address'}</Text>
              <Text>MOBILE NO. - {quotation.customer?.mobile || 'Customer Mobile'}</Text>
              {
                quotation.customer?.gst && (
                  <Text>GSTIN NO - {quotation.customer?.gst || ''}</Text>
                )
              }
            </View>
            <View style={styles.metaRight}>
              <Text>Quotation No: {quotation.quotationNo || 'VIN00000'}</Text>
              <Text style={{ marginTop: 5, alignSelf: 'flex-end' }}>Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text>
            </View>
          </View>

          {/* Customer Section */}
          <View style={styles.customerSection}>
            <Text style={styles.subjectLine}>SUB: TENDERING FOR THE QUOTATION</Text>
            <View style={styles.greeting}>
              <Text>
                Dear <Text style={{ textTransform: 'uppercase' }}>{quotation.customer?.name || 'Customer'}</Text>,
              </Text>
              <Text>Thank you for your interest in our High-Quality Products. We are pleased to quote our best price for the below mentioned products as follows.</Text>
            </View>
          </View>

          {/* Items Table */}
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.productCol}>Product</Text>
              <Text style={styles.qtyCol}>Quantity</Text>
              <Text style={styles.priceCol}>Sale Price</Text>
              <Text style={styles.gstCol}>GST Amount</Text>
              <Text style={styles.totalCol}>Total</Text>
            </View>

            {/* Table Rows */}
            {quotation.items?.map((item, index) => {
              const subtotalAmount = item.quantity * item.unitPrice;
              const gstAmount = item.gstAmount || (subtotalAmount * (item.gstPercent || 18)) / 100;
              const totalAmount = subtotalAmount + gstAmount;

              return (
                <View key={`item-${item.productName}-${index}`} style={styles.tableRow} wrap={false}>
                  <View style={styles.productCol}>
                    <Text style={styles.productName}>{item.productName || 'Product Name'}</Text>
                    {item.description && (
                      <Text style={styles.productDesc}>{item.description}</Text>
                    )}
                  </View>
                  <Text style={styles.qtyCol}>{item.quantity || 1}</Text>
                  <Text style={{ ...styles.priceCol, textAlign: 'right' }}>{formatCurrency(item.unitPrice || 0)}</Text>
                  <Text style={{ ...styles.gstCol, textAlign: 'right' }}>{`${formatCurrency(gstAmount)} (@${item.gstPercent || 18}%)`}</Text>
                  <Text style={{ ...styles.totalCol, textAlign: 'right' }}>{formatCurrency(totalAmount)}</Text>
                </View>
              );
            })}
          </View>

          {/* Totals Section */}
          <View style={styles.totalsSection} wrap={false}>
            <View style={styles.totalsTableHidden}></View>
            <View style={styles.totalsTable}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalAmount}>{formatCurrency(quotation.subtotal || subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalAmount}>{formatCurrency(quotation.tax || taxTotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Shipping Cost</Text>
                <Text style={styles.totalAmount}>{formatCurrency(shippingCost)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Shipping Tax</Text>
                <Text style={styles.totalAmount}>{formatCurrency(shippingTax)}</Text>
              </View>
              {quotation.additionalCharges && quotation.additionalCharges.length > 0 && quotation.additionalCharges.map((charge: any, index: number) => (
                <View key={`charge-${index}`} style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{charge.name}</Text>
                  <Text style={styles.totalAmount}>{formatCurrency(charge.amount)}</Text>
                </View>
              ))}
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalAmount}>{formatCurrency(quotation.grandTotal || grandTotal)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.totalWrittenInWords}>
            <Text style={styles.totalWrittenInWordsText}>In Words: {formatCurrencyToWords(quotation.grandTotal || grandTotal)}</Text>
          </View>

          {/* Terms & Conditions */}
          <View style={styles.termsSection}>
            <View style={styles.termsContent}>
              <Text style={styles.termsTitle}>Terms & conditions:{''}</Text>
            </View>

            <View style={styles.termsContent}>
              <Text>
                • <Text style={{ fontWeight: 'bold' }}>ORDER & PAYMENTS:</Text> "To book your order you must pay 50% in advance and rest before delivery. Order once placed cannot be cancelled whatsoever and incase of cancellation the total advance paid by the customer will be forfeited."
              </Text>
            </View>

            <View style={styles.termsContent}>
              <Text>
                • <Text style={{ fontWeight: 'bold' }}>TAXES:</Text> 18% GST will be charged on the product extra apart from the machinery cost.
              </Text>
            </View>

            <View style={styles.termsContent}>
              <Text>
                • <Text style={{ fontWeight: 'bold' }}>MANUFACTURING & TRANSPORT:</Text> Transportation of the machinery will be from anywhere in India and you will pay the packaging and transportation charges from the manufacturing factory to your place. You must arrange transportation of your machinery from the factory and in case you are unable to arrange it you can ask us to arrange it for you.
              </Text>
            </View>

            <View style={styles.termsContent}>
              <Text>
                • <Text style={{ fontWeight: 'bold' }}>MACHINE INSURANCE:</Text> The insurance of transportation is customers scope & should be borne by thee customer, if consignment is not insured it will be at customer risk. Any lost or damage of the machinery cannot be claimed to us by the customer.
              </Text>
            </View>

            <View style={styles.termsContent}>
              <Text>
                • <Text style={{ fontWeight: 'bold' }}>DELIVERY:</Text> Delivery time is 2 to 4 Weeks depending upon the machine availability. The complete manufacturing process of the machinery takes between 2 to 3 weeks. Once we receive the advance payment, we will start manufacturing the machinery and after receiving the full and final payment from the customer it takes additional 10 to 15 days' time to complete the machine manufacturing, testing and transport arrangement, after which the delivery will take place.
              </Text>
            </View>

            <View style={styles.termsContent}>
              <Text>
                • <Text style={{ fontWeight: 'bold' }}>INSTALLATION:</Text> Our Engineer will reach customers site/factory for installation after the machinery is received & raw material arrangement is done by the customer for the machine trail/installation. Once customer arranges the raw materials and confirms us, our technician will reach their place within 10 to 15 days for the installation. Customer has to pay the charges for one/two of our technicians lodging, food & round-trip travelling expenses for the erection, commissioning & installation.
              </Text>
            </View>

            <View style={styles.termsContent}>
              <Text>
                • <Text style={{ fontWeight: 'bold' }}>WARRANTY:</Text> 1 year manufacturing warranty on all mechanical spare parts only. Components like electrical & electronic parts, oil seals are not covered. Warranty is covered in case of any manufacturing defect without any manmade damage.
              </Text>
            </View>

            <View style={styles.termsContent}>
              <Text>
                • <Text style={{ fontWeight: 'bold' }}>SCOPE:</Text> Our scope of Supply is limited to our offer only and not covers the things specifically not mentioned in our offer.
              </Text>
            </View>

            <View style={styles.termsContent}>
              <Text>
                • <Text style={{ fontWeight: 'bold' }}>VARIATION:</Text> There is variation in requirements of Laboratory items (Glasswares, Chemicals, Equipments etc.) as per BIS to BIS all India. Hence customer must confirm & specify their detailed requirements of Glasswares, Chemicals, and Equipments.
              </Text>
            </View>
          </View>

          <View style={styles.backAndSignature}>
            <Text style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: 10 }}>Please make your remittance to our below bank account:</Text>
            <View style={styles.bankAndSignatureDetails}>
              <View>
                <Text><Text style={{ fontWeight: 'bold' }}>Beneficiary:</Text> VINAYAK INDUSTRIES</Text>
                <Text><Text style={{ fontWeight: 'bold' }}>Bank name:</Text> INDIAN BANK</Text>
                <Text><Text style={{ fontWeight: 'bold' }}>Branch name:</Text> GADAKANA, BHUBANESWAR</Text>
                <Text><Text style={{ fontWeight: 'bold' }}>Account no:</Text> 7658956285</Text>
                <Text><Text style={{ fontWeight: 'bold' }}>Ifsc Code:</Text> IDIB000G134</Text>
              </View>
              <View>
                <Image src='/vinayak_signature.png' style={styles.signature} />
              </View>
            </View>
            {quotation.validityDate && (
              <View style={{ marginTop: 85 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>
                  Valid Until: {formatDate(quotation.validityDate)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};

// React PDF Service
export class ReactPDFService {
  static async generateQuotationPDF(quotation: Quotation, business?: Business) {
    try {
      console.log('ReactPDFService: Generating PDF...');
      const doc = <QuotationDocument quotation={quotation} business={business} />;
      const blob = await pdf(doc).toBlob();
      console.log('ReactPDFService: PDF generated successfully');
      return blob;
    } catch (error) {
      console.error('ReactPDFService: Error generating PDF:', error);
      throw new Error(`React-PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async downloadQuotationPDF(quotation: Quotation, business?: Business, options: { filename?: string } = {}) {
    try {
      console.log('ReactPDFService: Starting PDF download...');
      const filename = options.filename || `quotation-${quotation.quotationNo || 'VIN-' + Date.now()}.pdf`;
      const pdfBlob = await this.generateQuotationPDF(quotation, business);

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      console.log('ReactPDFService: PDF download completed successfully');
    } catch (error) {
      console.error('ReactPDFService: Error downloading PDF:', error);
      throw error;
    }
  }

  static async previewQuotationPDF(quotation: Quotation, business?: Business) {
    try {
      const pdfBlob = await this.generateQuotationPDF(quotation, business);
      return URL.createObjectURL(pdfBlob);
    } catch (error) {
      console.error('ReactPDFService: Error generating preview:', error);
      throw error;
    }
  }
}

export interface ReactPDFOptions {
  filename?: string;
}

// Unified Preview Component
interface UnifiedQuotationPreviewProps {
  quotation: Quotation;
  business?: Business;
  onDownloadPDF?: () => Promise<void> | void;
  showActions?: boolean;
  className?: string;
}

export const UnifiedQuotationPreview: React.FC<UnifiedQuotationPreviewProps> = ({
  quotation,
  business,
  onDownloadPDF,
  showActions = true,
  className = '',
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [isClient, setIsClient] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsClient(true);

    const generatePreview = async () => {
      try {
        setPdfError(null);
        const blob = await ReactPDFService.generateQuotationPDF(quotation, business);
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error) {
        console.error('Failed to generate PDF preview:', error);
        setPdfError(error instanceof Error ? error.message : 'Failed to generate PDF preview');
      }
    };

    generatePreview();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [quotation, business]);

  const handleDownloadPDF = async () => {
    if (onDownloadPDF) {
      await onDownloadPDF();
      return;
    }

    setIsGenerating(true);
    try {
      console.log('UnifiedQuotationPreview: Starting PDF download...');
      await ReactPDFService.downloadQuotationPDF(quotation, business);
      toast({
        description: 'PDF downloaded successfully',
      });
    } catch (error) {
      console.error('UnifiedQuotationPreview: PDF download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isClient) {
    return (
      <div className={`unified-quotation-preview ${className}`}>
        <div className="flex justify-center items-center h-96">
          <div className="text-lg">Loading PDF preview...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`unified-quotation-preview ${className}`}>
      {showActions && (
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      )}

      <div style={{ width: '100%', height: '800px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        {pdfError && (
          <div className="flex flex-col justify-center items-center h-full p-8 text-center">
            <div className="text-lg font-semibold text-red-600 mb-2">PDF Preview Error</div>
            <div className="text-sm text-gray-600 mb-4">{pdfError}</div>
            <Button
              onClick={() => {
                setPdfError(null);
                setPdfUrl(null);
                ReactPDFService.generateQuotationPDF(quotation, business)
                  .then(blob => {
                    const url = URL.createObjectURL(blob);
                    setPdfUrl(url);
                  })
                  .catch(err => {
                    setPdfError(err instanceof Error ? err.message : 'Failed to generate PDF');
                  });
              }}
              variant="outline"
              size="sm"
            >
              Retry Preview
            </Button>
          </div>
        )}

        {!pdfError && pdfUrl && (
          <iframe
            src={pdfUrl}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
            title="PDF Preview"
          />
        )}

        {!pdfError && !pdfUrl && (
          <div className="flex justify-center items-center h-full">
            <div className="text-lg">Generating PDF preview...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReactPDFService;