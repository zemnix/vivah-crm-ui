import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { Quotation } from '@/api/quotationApi';

// Register fonts to prevent blank PDF rendering
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/roboto/v29/KFOmCnqEu92Fr1Mu4mxM.woff2",
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v29/KFOlCnqEu92Fr1MmEU9fBBc4.woff2",
      fontWeight: 'bold',
    }
  ]
});

// Simplified styles for debugging
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000000',
    fontFamily: 'Roboto',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000000',
    fontFamily: 'Roboto',
  },
  text: {
    fontSize: 12,
    marginBottom: 3,
    color: '#000000',
    fontFamily: 'Roboto',
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 100,
    color: '#000000',
    fontFamily: 'Roboto',
  },
  value: {
    fontSize: 12,
    flex: 1,
    color: '#000000',
    fontFamily: 'Roboto',
  },
  table: {
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingVertical: 5,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    padding: 3,
    color: '#000000',
    fontFamily: 'Roboto',
  },
  total: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 10,
    color: '#000000',
    fontFamily: 'Roboto',
  },
});

interface QuotationPDFProps {
  quotation: Quotation;
}

const formatCurrency = (amount: number): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0.00';
  }
  return `₹${amount.toFixed(2)}`;
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN');
  } catch {
    return 'Invalid Date';
  }
};

const QuotationPDF: React.FC<QuotationPDFProps> = ({ quotation }) => {
  // Add safety checks
  if (!quotation) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>Error: No quotation data</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Vinayak Industries</Text>
          <Text style={styles.text}>Industrial Machinery & Equipment Solutions</Text>
          <Text style={styles.text}>Email: info@vinayakindustries.com | Phone: +91 98765 43210</Text>
          <Text style={styles.text}>Address: Industrial Area, Phase-II, Sector 35, Chandigarh - 160002</Text>
        </View>

        {/* Quotation Header */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>QUOTATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Number:</Text>
            <Text style={styles.value}>{quotation.quotationNo || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatDate(quotation.date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{quotation.status || 'N/A'}</Text>
          </View>
        </View>

        {/* Customer Information */}
        {quotation.customer && (
          <View style={styles.section}>
            <Text style={styles.subtitle}>Bill To:</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{quotation.customer.name || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{quotation.customer.email || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Mobile:</Text>
              <Text style={styles.value}>{quotation.customer.mobile || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{quotation.customer.address || 'N/A'}</Text>
            </View>
            {quotation.customer.gst && (
              <View style={styles.row}>
                <Text style={styles.label}>GST:</Text>
                <Text style={styles.value}>{quotation.customer.gst}</Text>
              </View>
            )}
          </View>
        )}

        {/* Items */}
        {quotation.items && quotation.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.subtitle}>Items:</Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCell}>Product</Text>
                <Text style={styles.tableCell}>Qty</Text>
                <Text style={styles.tableCell}>Price</Text>
                <Text style={styles.tableCell}>GST%</Text>
                <Text style={styles.tableCell}>Total</Text>
              </View>
              
              {/* Table Rows */}
              {quotation.items.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{item.productName || 'N/A'}</Text>
                  <Text style={styles.tableCell}>{item.quantity || 0}</Text>
                  <Text style={styles.tableCell}>{formatCurrency(item.unitPrice)}</Text>
                  <Text style={styles.tableCell}>{item.gstPercent || 0}%</Text>
                  <Text style={styles.tableCell}>{formatCurrency(item.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Subtotal:</Text>
            <Text style={styles.value}>{formatCurrency(quotation.subtotal || 0)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tax:</Text>
            <Text style={styles.value}>{formatCurrency(quotation.tax || 0)}</Text>
          </View>
          {quotation.shippingCost > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Shipping:</Text>
              <Text style={styles.value}>{formatCurrency(quotation.shippingCost)}</Text>
            </View>
          )}
          <Text style={styles.total}>
            Grand Total: {formatCurrency(quotation.grandTotal || 0)}
          </Text>
        </View>

        {/* Notes */}
        {quotation.notes && (
          <View style={styles.section}>
            <Text style={styles.subtitle}>Notes:</Text>
            <Text style={styles.text}>{quotation.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={[styles.text, { textAlign: 'center', marginTop: 30 }]}>
          Thank you for your business!
        </Text>
      </Page>
    </Document>
  );
};

export default QuotationPDF;