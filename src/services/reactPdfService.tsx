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
    paddingTop: 96,
    paddingBottom: 64,
    fontSize: 10.6,
    fontFamily: "Helvetica",
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  watermark: {
    position: "absolute",
    top: 240,
    left: 95,
    width: 400,
    height: 200,
    aspectRatio: 1,
    opacity: 0.045,
  },
  headerFixed: {
    position: "absolute",
    top: 24,
    left: 24,
    right: 24,
    borderWidth: 1,
    borderColor: "#d4c2a0",
    borderRadius: 4,
    backgroundColor: "#fffcf7",
  },
  headerAccent: {
    height: 3,
    backgroundColor: "#87612a",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 72,
    height: 36,
    objectFit: "contain",
    marginRight: 10,
  },
  brandName: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
  },
  brandSubtitle: {
    marginTop: 1,
    fontSize: 9.2,
    color: "#5b6473",
    letterSpacing: 0.3,
  },
  quotationBadge: {
    alignItems: "flex-end",
  },
  quotationBadgeTitle: {
    fontSize: 8.5,
    color: "#745622",
    marginBottom: 2,
    letterSpacing: 1,
  },
  quotationBadgeRef: {
    borderWidth: 1,
    borderColor: "#dbc8a2",
    backgroundColor: "#f8f0df",
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10.4,
    fontFamily: "Helvetica-Bold",
    color: "#5a4320",
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: "#e7e0d1",
    borderRadius: 4,
    backgroundColor: "#fffdf8",
    padding: 12,
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionColLeft: {
    flex: 1,
    marginRight: 12,
  },
  sectionColRight: {
    width: "36%",
  },
  sectionHeading: {
    fontSize: 12.8,
    fontFamily: "Helvetica-Bold",
    color: "#24334e",
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    width: "36%",
    color: "#616b79",
    fontSize: 9.8,
  },
  infoValue: {
    width: "64%",
    color: "#1f2937",
    fontSize: 9.8,
    fontFamily: "Helvetica-Bold",
  },
  lineText: {
    marginBottom: 3,
    color: "#374151",
    fontSize: 9.8,
  },
  labelText: {
    fontSize: 8.8,
    color: "#687180",
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  valueText: {
    fontSize: 10.2,
    color: "#1f2937",
    marginBottom: 3,
  },
  valueEmphasis: {
    fontFamily: "Helvetica-Bold",
  },
  eventList: {
    marginTop: 2,
  },
  eventRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e5dfd2",
    borderRadius: 3,
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  eventIndex: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#cfbf97",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 9.2,
    color: "#735422",
    marginRight: 8,
    paddingTop: 3,
  },
  eventCard: {
    flex: 1,
  },
  eventHeading: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
    color: "#25324f",
    fontSize: 10.2,
  },
  eventMeta: {
    fontSize: 9.3,
    color: "#515b69",
    marginBottom: 1,
  },
  itemsTitle: {
    fontSize: 12.8,
    fontFamily: "Helvetica-Bold",
    color: "#24334e",
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#2f3f63",
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#2a3a5b",
    borderRadius: 3,
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d5dcea",
    minHeight: 28,
  },
  tableRowAlt: {
    backgroundColor: "#fbfdff",
  },
  th: {
    fontFamily: "Helvetica-Bold",
    paddingVertical: 7.5,
    paddingHorizontal: 6,
    textAlign: "center",
    fontSize: 10.2,
    letterSpacing: 0.4,
  },
  td: {
    paddingVertical: 6.2,
    paddingHorizontal: 6,
    fontSize: 9.7,
    color: "#253247",
  },
  colParticular: {
    width: "32%",
    borderRightWidth: 1,
    borderColor: "#d5dcea",
  },
  colItem: {
    width: "32%",
    borderRightWidth: 1,
    borderColor: "#d5dcea",
  },
  colNos: {
    width: "16%",
    borderRightWidth: 1,
    borderColor: "#d5dcea",
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
    borderColor: "#d5dcea",
  },
  categorySpanCell: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f3e7",
    borderRightWidth: 1,
    borderColor: "#d5dcea",
  },
  categorySpanText: {
    textAlign: "center",
    width: "100%",
    fontFamily: "Helvetica-Bold",
    fontSize: 9.4,
    color: "#6a4f23",
  },
  groupedRight: {
    width: "68%",
  },
  groupedInnerRow: {
    flexDirection: "row",
    minHeight: 28,
  },
  groupedInnerRowAlt: {
    backgroundColor: "#fbfdff",
  },
  groupedInnerRowDivider: {
    borderBottomWidth: 1,
    borderColor: "#d5dcea",
  },
  colItemInGroup: {
    width: "47.0588%",
    borderRightWidth: 1,
    borderColor: "#d5dcea",
  },
  colNosInGroup: {
    width: "23.5294%",
    borderRightWidth: 1,
    borderColor: "#d5dcea",
    textAlign: "center",
  },
  colPriceInGroup: {
    width: "29.4118%",
    textAlign: "right",
  },
  summaryCard: {
    marginTop: 12,
    alignSelf: "flex-end",
    width: "47%",
    borderWidth: 1.2,
    borderColor: "#cbb68a",
    borderRadius: 4,
    backgroundColor: "#fffdfa",
  },
  summaryHeader: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "#e6ddca",
    backgroundColor: "#f8f2e5",
    color: "#644920",
    fontSize: 9.4,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#ece6d8",
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  summaryLabel: {
    fontSize: 9.8,
    color: "#374151",
  },
  summaryValue: {
    fontSize: 9.8,
    color: "#111827",
    fontFamily: "Helvetica-Bold",
  },
  summaryGrand: {
    borderBottomWidth: 0,
    backgroundColor: "#f4ece0",
    paddingVertical: 7,
  },
  summaryGrandText: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#5c4320",
  },
  finalNotes: {
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "#dfd7c4",
    paddingTop: 8,
  },
  amountWords: {
    fontSize: 9.8,
    color: "#24334e",
    marginBottom: 4,
  },
  validityText: {
    fontSize: 9.5,
    color: "#5f6b7d",
  },
  pageFooter: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 20,
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    paddingTop: 4,
    textAlign: "right",
    fontSize: 8.9,
    color: "#7b8594",
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
        <View style={styles.headerFixed} fixed>
          <View style={styles.headerAccent} />
          <View style={styles.headerContent}>
            <View style={styles.brandBlock}>
              <Image src="/vivah-creations-logo.png" style={styles.logo} />
              
            </View>
            <View>
                <Text style={styles.brandName}>Vivah Creations</Text>
                {/* <Text style={styles.brandSubtitle}>EVENT MANAGEMENT QUOTATION</Text> */}
              </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionColLeft}>
              <Text style={styles.sectionHeading}>Company Address</Text>
              <Text style={styles.lineText}>VIVAH CREATIONS</Text>
              <Text style={styles.lineText}>SATYA VIHAR, BBSR</Text>
              <Text style={styles.lineText}>MOB - 7205946778 / 9777144463</Text>
              <Text style={[styles.sectionHeading, { marginTop: 9 }]}>Quotation For</Text>
              <Text style={[styles.valueText, styles.valueEmphasis]}>{quotation.customer?.name || "N/A"}</Text>
              <Text style={styles.valueText}>{quotation.customer?.mobile || "N/A"}</Text>
              <Text style={styles.valueText}>{quotation.customer?.address || "N/A"}</Text>
            </View>
            <View style={styles.sectionColRight}>
              <Text style={styles.sectionHeading}>Quotation Details</Text>
              <Text style={styles.labelText}>Reference No.</Text>
              <Text style={[styles.valueText, styles.valueEmphasis]}>{quotation.quotationNo || "N/A"}</Text>
              <Text style={styles.labelText}>Date</Text>
              <Text style={styles.valueText}>{safeDate(quotation.date || quotation.createdAt)}</Text>
              <Text style={styles.labelText}>Prepared By</Text>
              <Text style={styles.valueText}>Vivah Creations Team</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Event Details</Text>
          <View style={styles.eventList}>
            {lead?.typesOfEvent?.length ? (
              lead.typesOfEvent.map((event, index) => (
                <View key={`${event.name}-${event.date}-${index}`} style={styles.eventRow}>
                  <Text style={styles.eventIndex}>{index + 1}</Text>
                  <View style={styles.eventCard}>
                    <Text style={styles.eventHeading}>{event.name}</Text>
                    <Text style={styles.eventMeta}>Date: {safeDate(event.date)}</Text>
                    <Text style={styles.eventMeta}>Session: {event.dayNight || "N/A"}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.eventRow}>
                <Text style={styles.eventIndex}>1</Text>
                <View style={styles.eventCard}>
                  <Text style={styles.eventHeading}>No event details available</Text>
                  <Text style={styles.eventMeta}>Please confirm event schedule.</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.itemsTitle}>Items & Services</Text>

        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, styles.colParticular]}>PARTICULARS</Text>
          <Text style={[styles.th, styles.colItem]}>ITEM</Text>
          <Text style={[styles.th, styles.colNos]}>NOS</Text>
          <Text style={[styles.th, styles.colPrice]}>AMOUNT</Text>
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
                      ...(rowIndex % 2 === 1 ? [styles.groupedInnerRowAlt] : []),
                      ...(rowIndex < group.rows.length - 1 ? [styles.groupedInnerRowDivider] : []),
                    ]}
                  >
                    <Text style={[styles.td, styles.colItemInGroup]}>{row.itemName.toUpperCase()}</Text>
                    <Text style={[styles.td, styles.colNosInGroup]}>{row.nos || "-"}</Text>
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
            <Text style={[styles.td, styles.colNos]}>-</Text>
            <Text style={[styles.td, styles.colPrice]}>0</Text>
          </View>
        )}

        {(quotation.additionalCharges || []).map((charge, index) => (
          <View key={`${charge.name}-${index}`} style={[styles.tableRow, ...(index % 2 === 0 ? [styles.tableRowAlt] : [])]}>
            <Text style={[styles.td, styles.colParticular]} />
            <Text style={[styles.td, styles.colItem]}>{charge.name}</Text>
            <Text style={[styles.td, styles.colNos]}>-</Text>
            <Text style={[styles.td, styles.colPrice]}>{formatAmount(Number(charge.amount) || 0)}</Text>
          </View>
        ))}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeader}>SUMMARY</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Total</Text>
            <Text style={styles.summaryValue}>{formatAmount(itemsTotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Additional Charges</Text>
            <Text style={styles.summaryValue}>{formatAmount(additionalChargesTotal)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryGrand]}>
            <Text style={styles.summaryGrandText}>Grand Total</Text>
            <Text style={styles.summaryGrandText}>{formatAmount(grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.finalNotes}>
          <Text style={styles.amountWords}>In Words: {amountInWords(grandTotal)}</Text>
          <Text style={styles.validityText}>Validity: {safeDate(quotation.validityDate)}</Text>
          {quotation.notes ? <Text style={[styles.validityText, { marginTop: 3 }]}>Note: {quotation.notes}</Text> : null}
        </View>
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
