import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const FONT_FAMILY = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';

const styles = StyleSheet.create({
    page: { padding: 20, fontFamily: FONT_FAMILY, fontSize: 9, color: '#000' },
    title: { textAlign: 'center', fontSize: 13, fontFamily: FONT_BOLD, border: '1 solid #000', backgroundColor: '#eee', padding: 4, marginBottom: -1 },
    bold: { fontFamily: FONT_BOLD },
    row: { flexDirection: 'row' },
    w33: { width: '33.33%' },
    w40: { width: '40%' },
    w30: { width: '30%' },
    w50: { width: '50%' },
    borderTop: { borderTop: '1 solid #000' },
    borderBottom: { borderBottom: '1 solid #000' },
    borderRight: { borderRight: '1 solid #000' },
    pad: { padding: 4 },
    center: { textAlign: 'center' },
    right: { textAlign: 'right' },
    tableHeader: { backgroundColor: '#f2f2f2', fontFamily: FONT_BOLD, fontSize: 8, flexDirection: 'row', borderBottom: '1 solid #000' },
    tableCell: { padding: 3, borderRight: '1 solid #000', fontSize: 8, minHeight: 18 },
    tableCellLast: { padding: 3, fontSize: 8, minHeight: 18 },
    footerSection: { flexDirection: 'row', borderLeft: '1 solid #000', borderRight: '1 solid #000', borderBottom: '1 solid #000' }
});

const fmtN = (v, d = 2) => parseFloat(v || 0).toFixed(d);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : 'N/A';
const numberToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const n = ('0000000' + Math.round(num)).substr(-7).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (+n[1] !== 0) ? (a[+n[1]] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Lakh ' : '';
    str += (+n[2] !== 0) ? (a[+n[2]] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Thousand ' : '';
    str += (+n[3] !== 0) ? (a[+n[3]] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Hundred ' : '';
    str += (+n[4] !== 0) ? (a[+n[4]] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'and ' : '';
    str += (+n[5] !== 0) ? (a[+n[5]] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim() + ' Only';
};

export const SalesOrderPDF = ({ order, settings }) => {
    const items = order.items || [];
    const total = parseFloat(order.total || 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.title}>SALES ORDER</Text>

                <View style={{ border: '1 solid #000' }}>
                    <View style={styles.row}>
                        <View style={[styles.w40, styles.pad, styles.borderRight, { minHeight: 60 }]}>
                            {settings.store_logo_url && <Image src={settings.store_logo_url} style={{ maxHeight: 40, marginBottom: 4 }} />}
                            <Text style={[styles.bold, { fontSize: 11 }]}>{settings.store_name || 'YOUR COMPANY'}</Text>
                            <Text>{settings.store_address || ''}</Text>
                            {settings.company_gstin && <Text>GSTIN: <Text style={styles.bold}>{settings.company_gstin}</Text></Text>}
                            {settings.store_phone && <Text>Ph: {settings.store_phone}</Text>}
                            {settings.store_email && <Text>Email: {settings.store_email}</Text>}
                        </View>
                        <View style={[styles.w30, styles.pad, styles.borderRight]}>
                            <Text style={{ color: '#555', fontSize: 8 }}>Order No.</Text>
                            <Text style={[styles.bold, { marginBottom: 8 }]}>{order.order_number}</Text>
                            <Text style={{ color: '#555', fontSize: 8 }}>Expected Delivery</Text>
                            <Text style={styles.bold}>{fmtDate(order.expected_delivery_date)}</Text>
                        </View>
                        <View style={[styles.w30, styles.pad]}>
                            <Text style={{ color: '#555', fontSize: 8 }}>Order Date</Text>
                            <Text style={[styles.bold, { marginBottom: 8 }]}>{fmtDate(order.order_date)}</Text>
                            <Text style={{ color: '#555', fontSize: 8 }}>Status</Text>
                            <Text style={styles.bold}>{(order.status || 'PENDING').toUpperCase()}</Text>
                        </View>
                    </View>
                    <View style={[styles.borderTop, styles.pad]}>
                        <Text style={{ color: '#555', fontSize: 8 }}>Customer (Bill To)</Text>
                        <Text style={[styles.bold, { fontSize: 10 }]}>{order.customer?.name || 'N/A'}</Text>
                        {order.customer?.address_line1 && <Text>{order.customer.address_line1}</Text>}
                        {order.customer?.gst_number && <Text>GSTIN: <Text style={styles.bold}>{order.customer.gst_number}</Text></Text>}
                        {order.customer?.state && <Text>State: {order.customer.state}</Text>}
                    </View>
                </View>

                <View style={{ border: '1 solid #000', borderTop: 'none' }}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableCell, styles.center, { width: 25 }]}>#</Text>
                        <Text style={[styles.tableCell, { flex: 1 }]}>Description</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 40 }]}>HSN</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 40 }]}>Qty</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 45 }]}>Rate(₹)</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 35 }]}>Disc%</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 50 }]}>Taxable</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 35 }]}>GST%</Text>
                        <Text style={[styles.tableCellLast, styles.center, { width: 55 }]}>Amount(₹)</Text>
                    </View>

                    {items.map((item, i) => {
                        const subtotal = (item.quantity || 0) * (item.unit_price || 0);
                        const disc = subtotal * ((item.discount_percentage || 0) / 100);
                        const taxable = subtotal - disc;
                        const tax = taxable * ((item.tax_percentage || 0) / 100);
                        return (
                            <View style={styles.row} key={i}>
                                <Text style={[styles.tableCell, styles.center, { width: 25 }]}>{i + 1}</Text>
                                <View style={[styles.tableCell, { flex: 1 }]}>
                                    <Text style={styles.bold}>{item.product?.name || '-'}</Text>
                                    {item.product?.sku && <Text style={{ fontSize: 7, color: '#555' }}>{item.product.sku}</Text>}
                                </View>
                                <Text style={[styles.tableCell, styles.center, { width: 40 }]}>{item.product?.hsn_code || 'N/A'}</Text>
                                <Text style={[styles.tableCell, styles.center, { width: 40 }]}>{fmtN(item.quantity, 0)} {item.product?.unit || ''}</Text>
                                <Text style={[styles.tableCell, styles.right, { width: 45 }]}>{fmtN(item.unit_price)}</Text>
                                <Text style={[styles.tableCell, styles.center, { width: 35 }]}>{item.discount_percentage > 0 ? `${fmtN(item.discount_percentage)}%` : '-'}</Text>
                                <Text style={[styles.tableCell, styles.right, { width: 50 }]}>{fmtN(taxable)}</Text>
                                <Text style={[styles.tableCell, styles.center, { width: 35 }]}>{fmtN(item.tax_percentage)}%</Text>
                                <Text style={[styles.tableCellLast, styles.right, styles.bold, { width: 55 }]}>{fmtN(taxable + tax)}</Text>
                            </View>
                        );
                    })}

                    {Array(Math.max(0, 8 - items.length)).fill(0).map((_, idx) => (
                        <View style={styles.row} key={'empty_' + idx}>
                            <Text style={[styles.tableCell, { width: 25 }]} />
                            <Text style={[styles.tableCell, { flex: 1 }]} />
                            <Text style={[styles.tableCell, { width: 40 }]} />
                            <Text style={[styles.tableCell, { width: 40 }]} />
                            <Text style={[styles.tableCell, { width: 45 }]} />
                            <Text style={[styles.tableCell, { width: 35 }]} />
                            <Text style={[styles.tableCell, { width: 50 }]} />
                            <Text style={[styles.tableCell, { width: 35 }]} />
                            <Text style={[styles.tableCellLast, { width: 55 }]} />
                        </View>
                    ))}

                    <View style={[styles.row, styles.borderTop, { backgroundColor: '#f9f9f9' }]}>
                        <Text style={[styles.tableCell, styles.right, styles.bold, { flex: 1 }]}>Total</Text>
                        <Text style={[styles.tableCell, styles.right, styles.bold, { width: 50 }]}>{fmtN(items.reduce((a, it) => a + (it.quantity * it.unit_price * (1 - (it.discount_percentage || 0) / 100)), 0))}</Text>
                        <Text style={[styles.tableCell, { width: 35 }]} />
                        <Text style={[styles.tableCellLast, styles.right, styles.bold, { width: 55 }]}>{fmtN(total)}</Text>
                    </View>
                </View>

                <View style={[{ border: '1 solid #000', borderTop: 'none', padding: 5 }]}>
                    <Text style={{ color: '#555', fontSize: 8 }}>Amount in Words: </Text>
                    <Text style={styles.bold}>INR {numberToWords(total)}</Text>
                </View>

                <View style={[styles.footerSection, { marginTop: 0 }]}>
                    <View style={[styles.pad, styles.borderRight, { flex: 1 }]}>
                        <Text style={styles.bold}>Bank Details</Text>
                        <Text>Bank: <Text style={styles.bold}>{settings.bank_name || 'N/A'}</Text></Text>
                        <Text>A/c No: <Text style={styles.bold}>{settings.bank_account_no || 'N/A'}</Text></Text>
                        <Text>IFSC: <Text style={styles.bold}>{settings.bank_ifsc || 'N/A'}</Text></Text>
                        <Text>Branch: {settings.bank_branch || 'N/A'}</Text>

                        <View style={{ marginTop: 8 }}>
                            <Text style={[styles.bold, { textDecoration: 'underline', fontSize: 8 }]}>Declaration</Text>
                            <Text style={{ fontSize: 8 }}>We declare that this document shows the actual price of the goods described and that all particulars are true and correct.</Text>
                        </View>
                        {order.payment_terms && <Text style={{ marginTop: 4, fontSize: 8 }}><Text style={styles.bold}>Payment Terms:</Text> {order.payment_terms}</Text>}
                        {order.notes && <Text style={{ marginTop: 2, fontSize: 8 }}><Text style={styles.bold}>Notes:</Text> {order.notes}</Text>}
                    </View>
                    <View style={[styles.pad, styles.center, { width: 200 }]}>
                        <Text style={{ fontSize: 8 }}>For {settings.store_name || ''}</Text>
                        {settings.signature_stamp_url ? (
                            <Image src={settings.signature_stamp_url} style={{ maxHeight: 50, marginVertical: 8 }} />
                        ) : <View style={{ height: 50, marginVertical: 8 }} />}
                        <Text style={styles.bold}>Authorised Signatory</Text>
                    </View>
                </View>

                <Text style={[styles.center, { fontSize: 8, marginTop: 4 }]}>This is a Computer Generated Sales Order</Text>
            </Page>
        </Document>
    );
};
