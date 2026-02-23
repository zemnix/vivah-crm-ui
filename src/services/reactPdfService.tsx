import React from "react";
import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { Download, Printer } from "lucide-react";
import { ToWords } from "to-words";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getLeadByIdApi, type Lead } from "@/api/leadApi";
import type { Quotation } from "@/api/quotationApi";

interface QuotationDocumentProps {
  quotation: Quotation;
  lead: Lead | null;
}

interface FlatRow {
  category: string;
  itemName: string;
  nos: string;
  price: number;
}

interface CategoryGroup {
  category: string;
  rows: FlatRow[];
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    paddingTop: 74,
    paddingBottom: 74,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  watermark: {
    position: "absolute",
    top: 240,
    left: 50,
    width: 500,
    height: 301,
    aspectRatio: 1,
    opacity: 0.19,
  },
  banner: {
    backgroundColor: "#e87f4f",
    minHeight: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 0,
    borderRadius: 2,
    marginBottom: 14,
  },
  bannerFixed: {
    position: "absolute",
    top: 24,
    left: 24,
    right: 24,
    backgroundColor: "#e87f4f",
    minHeight: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 0,
    borderRadius: 2,
  },
  bannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 46,
    height: 36,
    objectFit: "contain",
  },
  bannerCompany: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 25,
    fontFamily: "Times-Bold",
  },
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 20,
  },
  col: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#1f3557",
    marginBottom: 8,
  },
  lineText: {
    marginBottom: 4,
  },
  muted: {
    color: "#4b5563",
    marginTop: 100
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    marginVertical: 10,
  },
  eventCard: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 3,
    padding: 8,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  eventHeading: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  commentsTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1f3557",
    marginBottom: 6,
  },
  commentsText: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 3,
    padding: 8,
    backgroundColor: "#fafafa",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#556b95",
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#94a3b8",
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#cbd5e1",
    minHeight: 28,
  },
  th: {
    fontFamily: "Helvetica-Bold",
    paddingVertical: 7,
    paddingHorizontal: 6,
    textAlign: "center",
    fontSize: 11,
  },
  td: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 10.5,
  },
  colParticular: {
    width: "32%",
    borderRightWidth: 1,
    borderColor: "#cbd5e1",
  },
  colItem: {
    width: "32%",
    borderRightWidth: 1,
    borderColor: "#cbd5e1",
  },
  colNos: {
    width: "16%",
    borderRightWidth: 1,
    borderColor: "#cbd5e1",
    textAlign: "center",
  },
  colPrice: {
    width: "20%",
    textAlign: "right",
  },
  groupedRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#cbd5e1",
  },
  categorySpanCell: {
    justifyContent: "center",
    alignItems: "center",
  },
  categorySpanText: {
    textAlign: "center",
    width: "100%",
  },
  groupedRight: {
    width: "68%",
  },
  groupedInnerRow: {
    flexDirection: "row",
    minHeight: 28,
  },
  groupedInnerRowDivider: {
    borderBottomWidth: 1,
    borderColor: "#cbd5e1",
  },
  colItemInGroup: {
    width: "47.0588%",
    borderRightWidth: 1,
    borderColor: "#cbd5e1",
  },
  colNosInGroup: {
    width: "23.5294%",
    borderRightWidth: 1,
    borderColor: "#cbd5e1",
    textAlign: "center",
  },
  colPriceInGroup: {
    width: "29.4118%",
    textAlign: "right",
  },
  summary: {
    marginTop: 12,
    alignSelf: "flex-end",
    width: "45%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  summaryLast: {
    backgroundColor: "#ecf2ff",
    fontFamily: "Helvetica-Bold",
  },
  inWords: {
    marginTop: 10,
    fontSize: 10.5,
  },
  pageFooter: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 20,
    paddingTop: 4,
    textAlign: "right",
    fontSize: 9.5,
    color: "#6b7280",
  },
});

const safeDate = (value?: string): string => {
  if (!value) {
    return new Date().toLocaleDateString("en-IN");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString("en-IN");
  }
  return date.toLocaleDateString("en-IN");
};

const formatAmount = (amount: number): string => {
  const numeric = Number.isFinite(amount) ? amount : 0;
  return numeric.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const amountInWords = (amount: number): string => {
  try {
    const toWords = new ToWords({ localeCode: "en-IN" });
    const words = toWords.convert(Math.round(amount || 0));
    return `${words.charAt(0).toUpperCase()}${words.slice(1)} only`;
  } catch {
    return `${amount} only`;
  }
};

const toFlatRows = (items: Quotation["items"]): FlatRow[] => {
  const rows: FlatRow[] = [];
  let previousCategory = "";

  (items || []).forEach((item) => {
    const explicitCategory = (item.category || "").trim();
    const category = explicitCategory || previousCategory;
    const row: FlatRow = {
      category,
      itemName: (item.itemName || item.productName || "").trim(),
      nos: (item.nos || (typeof item.quantity === "number" ? String(item.quantity) : "")).trim(),
      price:
        typeof item.price === "number"
          ? item.price
          : typeof item.total === "number"
            ? item.total
            : typeof item.unitPrice === "number"
              ? item.unitPrice
              : 0,
    };
    rows.push(row);
    if (explicitCategory) {
      previousCategory = explicitCategory;
    }
  });

  return rows;
};

const toCategoryGroups = (rows: FlatRow[]): CategoryGroup[] => {
  const groups: CategoryGroup[] = [];
  let currentGroup: CategoryGroup | null = null;

  rows.forEach((row) => {
    if (!currentGroup || currentGroup.category !== row.category) {
      currentGroup = {
        category: row.category,
        rows: [row],
      };
      groups.push(currentGroup);
      return;
    }

    currentGroup.rows.push(row);
  });

  return groups;
};

const QuotationDocument: React.FC<Readonly<QuotationDocumentProps>> = ({ quotation, lead }) => {
  const rows = toFlatRows(quotation.items || []);
  const groupedRows = toCategoryGroups(rows);
  const itemsTotal = rows.reduce((sum, row) => sum + (Number(row.price) || 0), 0);
  const additionalChargesTotal = (quotation.additionalCharges || []).reduce(
    (sum, charge) => sum + (Number(charge.amount) || 0),
    0
  );
  const computedTotal = itemsTotal + additionalChargesTotal;
  const quotedGrandTotal = Number(quotation.grandTotal);
  const grandTotal =
    Number.isFinite(quotedGrandTotal) && Math.abs(quotedGrandTotal - computedTotal) < 0.01
      ? quotedGrandTotal
      : computedTotal;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src="/vivah-creations-logo.png" style={styles.watermark} fixed />
        <Text
          style={styles.pageFooter}
          fixed
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
        <View style={styles.bannerFixed} fixed>
          <View style={styles.bannerLeft}>
            <Image src="/vivah-creations-logo.png" style={styles.logo} />
          </View>
          <Text style={styles.bannerTitle}>Quotation</Text>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Company Address</Text>
            <Text style={styles.lineText}>VIVAH CREATIONS</Text>
            <Text style={styles.lineText}>SATYA VIHAR, BBSR</Text>
            <Text style={styles.lineText}>MOB-7205946778 / 9777144463</Text>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Quotation For</Text>
            <Text style={styles.lineText}>{quotation.customer?.name || "N/A"}</Text>
            <Text style={styles.lineText}>{quotation.customer?.mobile || "N/A"}</Text>
            <Text style={styles.lineText}>{quotation.customer?.address || "N/A"}</Text>
          </View>
          <View style={styles.col}>
            <Text style={[styles.sectionTitle, { textAlign: "right" }]}>Quotation Details</Text>
            <Text style={[styles.lineText, { textAlign: "right" }]}>
              <Text style={styles.muted}>Ref No:</Text> {quotation.quotationNo || "N/A"}
            </Text>
            <Text style={[styles.lineText, { textAlign: "right" }]}>
              <Text style={styles.muted}>Date:</Text> {safeDate(quotation.date || quotation.createdAt)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Event Details</Text>
        {lead?.typesOfEvent?.length ? (
          lead.typesOfEvent.map((event, index) => (
            <View key={`${event.name}-${event.date}-${index}`} style={styles.eventCard}>
              <Text style={styles.eventHeading}>{event.name}</Text>
              <Text>Date: {safeDate(event.date)}</Text>
              <Text>Day/Night: {event.dayNight}</Text>
            </View>
          ))
        ) : (
          <View style={styles.eventCard}>
            <Text >No event details available.</Text>
          </View>
        )}

        <Text style={{marginTop: 10}} ></Text>

        <Text style={styles.sectionTitle}>Items</Text>

        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, styles.colParticular]}>PARTICULARS</Text>
          <Text style={[styles.th, styles.colItem]}>Item</Text>
          <Text style={[styles.th, styles.colNos]}>NOS</Text>
          <Text style={[styles.th, styles.colPrice]}>Amount</Text>
        </View>

        {groupedRows.length > 0 ? (
          groupedRows.map((group, groupIndex) => (
            <View key={`${group.category || "uncategorized"}-${groupIndex}`} style={styles.groupedRow}>
              <View style={[styles.colParticular, styles.categorySpanCell]}>
                <Text style={[styles.td, styles.categorySpanText]}>
                  {group.category ? group.category.toUpperCase() : "-"}
                </Text>
              </View>
              <View style={styles.groupedRight}>
                {group.rows.map((row, rowIndex) => (
                  <View
                    key={`${group.category}-${row.itemName}-${groupIndex}-${rowIndex}`}
                    style={[
                      styles.groupedInnerRow,
                      ...(rowIndex < group.rows.length - 1 ? [styles.groupedInnerRowDivider] : []),
                    ]}
                  >
                    <Text style={[styles.td, styles.colItemInGroup]}>{row.itemName.toUpperCase()}</Text>
                    <Text style={[styles.td, styles.colNosInGroup]}>{row.nos}</Text>
                    <Text style={[styles.td, styles.colPriceInGroup]}>{formatAmount(row.price)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.tableRow}>
            <Text style={[styles.td, styles.colParticular]} />
            <Text style={[styles.td, styles.colItem]}>No items</Text>
            <Text style={[styles.td, styles.colNos]} />
            <Text style={[styles.td, styles.colPrice]}>0</Text>
          </View>
        )}

        {(quotation.additionalCharges || []).map((charge, index) => (
          <View key={`${charge.name}-${index}`} style={styles.tableRow}>
            <Text style={[styles.td, styles.colParticular]} />
            <Text style={[styles.td, styles.colItem]}>{charge.name}</Text>
            <Text style={[styles.td, styles.colNos]} />
            <Text style={[styles.td, styles.colPrice]}>{formatAmount(Number(charge.amount) || 0)}</Text>
          </View>
        ))}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text>Items Total</Text>
            <Text>{formatAmount(itemsTotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Additional Charges</Text>
            <Text>{formatAmount(additionalChargesTotal)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryLast]}>
            <Text>Grand Total</Text>
            <Text>{formatAmount(grandTotal)}</Text>
          </View>
        </View>

        <Text style={[styles.lineText, { textAlign: "right", marginTop:10 }]}>
          <Text style={styles.inWords}>In Words: {amountInWords(grandTotal)}</Text>
        </Text>


        <Text style={styles.muted}>Validity: {safeDate(quotation.validityDate)}</Text>
      </Page>
    </Document>
  );
};

export interface ReactPDFOptions {
  filename?: string;
}

export class ReactPDFService {
  static async generateQuotationPDF(quotation: Quotation, _business?: unknown) {
    const leadId = quotation.leadId?._id;
    let lead: Lead | null = null;

    if (leadId) {
      try {
        lead = await getLeadByIdApi(leadId);
      } catch (error) {
        console.warn("Unable to fetch lead details for quotation PDF:", error);
      }
    }

    const doc = <QuotationDocument quotation={quotation} lead={lead} />;
    return pdf(doc).toBlob();
  }

  static async downloadQuotationPDF(quotation: Quotation, _business?: unknown, options: ReactPDFOptions = {}) {
    const filename = options.filename || `quotation-${quotation.quotationNo || Date.now()}.pdf`;
    const blob = await this.generateQuotationPDF(quotation);
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  static async previewQuotationPDF(quotation: Quotation, _business?: unknown) {
    const blob = await this.generateQuotationPDF(quotation);
    return URL.createObjectURL(blob);
  }
}

interface UnifiedQuotationPreviewProps {
  quotation: Quotation;
  business?: unknown;
  onDownloadPDF?: () => Promise<void> | void;
  showActions?: boolean;
  className?: string;
}

export const UnifiedQuotationPreview: React.FC<Readonly<UnifiedQuotationPreviewProps>> = ({
  quotation,
  business,
  onDownloadPDF,
  showActions = true,
  className = "",
}) => {
  const { toast } = useToast();
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    let createdUrl = "";

    const loadPreview = async () => {
      try {
        setPreviewError(null);
        const blob = await ReactPDFService.generateQuotationPDF(quotation, business);
        createdUrl = URL.createObjectURL(blob);
        if (mounted) {
          setPdfUrl(createdUrl);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate preview.";
        if (mounted) {
          setPreviewError(message);
          setPdfUrl(null);
        }
      }
    };

    void loadPreview();

    return () => {
      mounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [quotation, business]);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      if (onDownloadPDF) {
        await onDownloadPDF();
      } else {
        await ReactPDFService.downloadQuotationPDF(quotation, business);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download PDF.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {showActions && (
        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isGenerating}>
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      )}

      <div className="w-full h-[820px] rounded-md border bg-white overflow-hidden">
        {previewError ? (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <p className="font-medium text-red-600 mb-2">Unable to render preview</p>
            <p className="text-sm text-muted-foreground mb-4">{previewError}</p>
            <Button
              variant="outline"
              onClick={() => {
                setPdfUrl(null);
                setPreviewError(null);
              }}
            >
              Retry
            </Button>
          </div>
        ) : pdfUrl ? (
          <iframe src={pdfUrl} className="w-full h-full" title="Quotation PDF Preview" />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">Generating preview...</div>
        )}
      </div>
    </div>
  );
};

export default ReactPDFService;
