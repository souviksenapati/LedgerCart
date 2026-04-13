import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Standardize Helvetica
const FONT_FAMILY = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';

const styles = StyleSheet.create({
    page: {
        padding: 20,
        fontFamily: FONT_FAMILY,
        fontSize: 9,
        color: '#000',
    },
    title: {
        textAlign: 'center',
        fontSize: 14,
        fontFamily: FONT_BOLD,
        border: '1 solid #000',
        backgroundColor: '#eeeeee',
        padding: 4,
        marginBottom: -1, // overlap border
    },
    bold: { fontFamily: FONT_BOLD },
    row: { flexDirection: 'row' },
    col1: { flex: 1 },
    w33: { width: '33.33%' },
    w50: { width: '50%' },
    w66: { width: '66.66%' },
    borderAll: { border: '1 solid #000' },
    borderTop: { borderTop: '1 solid #000' },
    borderBottom: { borderBottom: '1 solid #000' },
    borderRight: { borderRight: '1 solid #000' },
    borderLeft: { borderLeft: '1 solid #000' },
    pad: { padding: 4 },
    center: { textAlign: 'center' },
    right: { textAlign: 'right' },
    tableHeader: {
        backgroundColor: '#f2f2f2',
        fontFamily: FONT_BOLD,
        fontSize: 8,
        flexDirection: 'row',
        borderBottom: '1 solid #000',
    },
    tableCell: {
        padding: 3,
        borderRight: '1 solid #000',
        fontSize: 8,
        minHeight: 18,
    },
    tableCellLast: {
        padding: 3,
        fontSize: 8,
        minHeight: 18,
    },
    footerSection: {
        flexDirection: 'row',
        borderLeft: '1 solid #000',
        borderRight: '1 solid #000',
        borderBottom: '1 solid #000',
    }
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

export const SalesInvoicePDF = ({ invoice, settings }) => {
    const items = invoice.items || [];

    // GST Breakdown
    const hsnBreakdown = {};
    items.forEach(item => {
        const hsn = item.product?.hsn_code || 'N/A';
        if (!hsnBreakdown[hsn]) hsnBreakdown[hsn] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, rate: item.tax_percentage || 0 };
        hsnBreakdown[hsn].taxable += parseFloat(item.taxable_amount || 0);
        hsnBreakdown[hsn].cgst += parseFloat(item.cgst_amount || 0);
        hsnBreakdown[hsn].sgst += parseFloat(item.sgst_amount || 0);
        hsnBreakdown[hsn].igst += parseFloat(item.igst_amount || 0);
    });

    const hsnRows = Object.entries(hsnBreakdown);

    // Table columns layout matches HTML
    // SI: 25, Desc: auto, HSN: 35, Qty: 40, Rate: 45, Taxable: 50, GST%: 30, CGST: 40, SGST: 40, IGST: 40, Amount: 50

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.title}>TAX INVOICE</Text>

                {/* Header Block */}
                <View style={[{ border: '1 solid #000' }]}>

                    {/* Top Row: Company (Rowspan 2 equivalent) | Invoice Info | Date Info */}
                    <View style={styles.row}>
                        <View style={[styles.w33, styles.pad, styles.borderRight]}>
                            {settings.store_logo_url && <Image src={settings.store_logo_url} style={{ maxHeight: 50, marginBottom: 4 }} />}
                            <Text style={[styles.bold, { fontSize: 13 }]}>{settings.store_name || 'YOUR COMPANY NAME'}</Text>
                            <Text>{settings.store_address || ''}</Text>
                            <Text>GSTIN/UIN: <Text style={styles.bold}>{settings.company_gstin || 'N/A'}</Text></Text>
                            <Text>State Name: Bhubaneswar, Odisha, Code: 21</Text>
                            <Text>Contact: {settings.store_phone || ''}</Text>
                            <Text>Email: {settings.store_email || ''}</Text>
                        </View>
                        <View style={styles.w66}>
                            <View style={[styles.row, styles.borderBottom]}>
                                <View style={[styles.w50, styles.pad, styles.borderRight, { minHeight: 40 }]}>
                                    <Text>Invoice No.</Text>
                                    <Text style={styles.bold}>{invoice.invoice_number}</Text>
                                </View>
                                <View style={[styles.w50, styles.pad]}>
                                    <Text>Dated</Text>
                                    <Text style={styles.bold}>{fmtDate(invoice.invoice_date)}</Text>
                                </View>
                            </View>
                            <View style={[styles.row, { minHeight: 40 }]}>
                                <View style={[styles.w50, styles.pad, styles.borderRight]}>
                                    <Text>Delivery Note</Text>
                                    <Text style={styles.bold}>{invoice.delivery_note_no || 'N/A'}</Text>
                                </View>
                                <View style={[styles.w50, styles.pad]}>
                                    <Text>Mode/Terms of Payment</Text>
                                    <Text style={[styles.bold, { textTransform: 'uppercase' }]}>{(invoice.payment_terms || '').replace('_', ' ')}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Consignee Row */}
                    <View style={[styles.row, styles.borderTop]}>
                        <View style={[styles.w33, styles.pad, styles.borderRight]}>
                            <Text style={{ fontSize: 8, color: '#444' }}>Consignee (Ship to)</Text>
                            <Text style={styles.bold}>{invoice.consignee_name || (invoice.customer?.name || 'N/A')}</Text>
                            <Text>{invoice.consignee_address || (invoice.customer?.address_line1 || '')}</Text>
                            <Text>GSTIN/UIN: <Text style={styles.bold}>{invoice.consignee_gstin || (invoice.customer?.gst_number || 'N/A')}</Text></Text>
                            <Text>State Name: {invoice.consignee_state || (invoice.customer?.state || 'N/A')}</Text>
                        </View>
                        <View style={styles.w66}>
                            <View style={[styles.row, styles.borderBottom]}>
                                <View style={[styles.w50, styles.pad, styles.borderRight, { minHeight: 40 }]}>
                                    <Text>Reference No. & Date.</Text>
                                    <Text style={styles.bold}>N/A</Text>
                                </View>
                                <View style={[styles.w50, styles.pad]}>
                                    <Text>Other References</Text>
                                    <Text style={styles.bold}>N/A</Text>
                                </View>
                            </View>
                            <View style={[styles.row, { minHeight: 40 }]}>
                                <View style={[styles.w50, styles.pad, styles.borderRight]}>
                                    <Text>Buyer's Order No.</Text>
                                    <Text style={styles.bold}>{invoice.buyer_order_no || 'N/A'}</Text>
                                </View>
                                <View style={[styles.w50, styles.pad]}>
                                    <Text>Dated</Text>
                                    <Text style={styles.bold}>N/A</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Buyer Row */}
                    <View style={[styles.row, styles.borderTop]}>
                        <View style={[styles.w33, styles.pad, styles.borderRight]}>
                            <Text style={{ fontSize: 8, color: '#444' }}>Buyer (Bill to)</Text>
                            <Text style={styles.bold}>{invoice.customer?.name || 'N/A'}</Text>
                            <Text>{invoice.customer?.address_line1 || ''}</Text>
                            <Text>GSTIN/UIN: <Text style={styles.bold}>{invoice.customer?.gst_number || 'N/A'}</Text></Text>
                            <Text>State Name: {invoice.customer?.state || 'N/A'}</Text>
                        </View>
                        <View style={styles.w66}>
                            <View style={[styles.row, styles.borderBottom]}>
                                <View style={[styles.w50, styles.pad, styles.borderRight, { minHeight: 40 }]}>
                                    <Text>Dispatch Doc No.</Text>
                                    <Text style={styles.bold}>N/A</Text>
                                </View>
                                <View style={[styles.w50, styles.pad]}>
                                    <Text>Delivery Note Date</Text>
                                    <Text style={styles.bold}>N/A</Text>
                                </View>
                            </View>
                            <View style={[styles.row, { minHeight: 40 }]}>
                                <View style={[styles.w50, styles.pad, styles.borderRight]}>
                                    <Text>Dispatched through</Text>
                                    <Text style={styles.bold}>N/A</Text>
                                </View>
                                <View style={[styles.w50, styles.pad]}>
                                    <Text>Destination</Text>
                                    <Text style={styles.bold}>N/A</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ITEMS TABLE */}
                <View style={[{ border: '1 solid #000', borderTop: 'none' }]}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableCell, styles.center, { width: 25 }]}>SI No.</Text>
                        <Text style={[styles.tableCell, { flex: 1 }]}>Description of Goods</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 45 }]}>HSN/SAC</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 45 }]}>Quantity</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 45 }]}>Rate</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 55 }]}>Taxable Value</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 35 }]}>GST %</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 45 }]}>CGST</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 45 }]}>SGST</Text>
                        <Text style={[styles.tableCell, styles.center, { width: 45 }]}>IGST</Text>
                        <Text style={[styles.tableCellLast, styles.center, { width: 55 }]}>Amount</Text>
                    </View>

                    {/* Rows */}
                    {items.map((item, i) => (
                        <View style={styles.row} key={i}>
                            <Text style={[styles.tableCell, styles.center, { width: 25 }]}>{i + 1}</Text>
                            <Text style={[styles.tableCell, styles.bold, { flex: 1 }]}>{item.product?.name || item.product_id || '-'}</Text>
                            <Text style={[styles.tableCell, styles.center, { width: 45 }]}>{item.product?.hsn_code || 'N/A'}</Text>
                            <Text style={[styles.tableCell, styles.center, { width: 45 }]}>{parseFloat(item.quantity).toFixed(0)} {item.product?.unit || ''}</Text>
                            <Text style={[styles.tableCell, styles.right, { width: 45 }]}>{fmtN(item.unit_price)}</Text>
                            <Text style={[styles.tableCell, styles.right, { width: 55 }]}>{fmtN(item.taxable_amount)}</Text>
                            <Text style={[styles.tableCell, styles.center, { width: 35 }]}>{fmtN(item.tax_percentage)}%</Text>
                            <Text style={[styles.tableCell, styles.right, { width: 45 }]}>{fmtN(item.cgst_amount)}</Text>
                            <Text style={[styles.tableCell, styles.right, { width: 45 }]}>{fmtN(item.sgst_amount)}</Text>
                            <Text style={[styles.tableCell, styles.right, { width: 45 }]}>{fmtN(item.igst_amount)}</Text>
                            <Text style={[styles.tableCellLast, styles.right, styles.bold, { width: 55 }]}>{fmtN(item.line_total)}</Text>
                        </View>
                    ))}

                    {/* Fill Empty Rows */}
                    {Array(Math.max(0, 8 - items.length)).fill(0).map((_, idx) => (
                        <View style={styles.row} key={'empty_' + idx}>
                            <Text style={[styles.tableCell, { width: 25 }]} />
                            <Text style={[styles.tableCell, { flex: 1 }]} />
                            <Text style={[styles.tableCell, { width: 45 }]} />
                            <Text style={[styles.tableCell, { width: 45 }]} />
                            <Text style={[styles.tableCell, { width: 45 }]} />
                            <Text style={[styles.tableCell, { width: 55 }]} />
                            <Text style={[styles.tableCell, { width: 35 }]} />
                            <Text style={[styles.tableCell, { width: 45 }]} />
                            <Text style={[styles.tableCell, { width: 45 }]} />
                            <Text style={[styles.tableCell, { width: 45 }]} />
                            <Text style={[styles.tableCellLast, { width: 55 }]} />
                        </View>
                    ))}

                    {/* Subtotal Row */}
                    <View style={[styles.row, styles.borderTop]}>
                        <Text style={[styles.tableCell, styles.right, styles.bold, { width: 25 + '100% (flex 1)' /* Hack for structure */, flex: 1 }]}>Total</Text>
                        <Text style={[styles.tableCell, styles.center, styles.bold, { width: 45 }]}>{items.reduce((s, i) => s + parseFloat(i.quantity), 0).toFixed(0)}</Text>
                        <Text style={[styles.tableCell, { width: 45 }]} />
                        <Text style={[styles.tableCell, styles.right, styles.bold, { width: 55 }]}>{fmtN(invoice.subtotal)}</Text>
                        <Text style={[styles.tableCell, { width: 35 }]} />
                        <Text style={[styles.tableCell, styles.right, styles.bold, { width: 45 }]}>{fmtN(invoice.cgst_amount)}</Text>
                        <Text style={[styles.tableCell, styles.right, styles.bold, { width: 45 }]}>{fmtN(invoice.sgst_amount)}</Text>
                        <Text style={[styles.tableCell, styles.right, styles.bold, { width: 45 }]}>{fmtN(invoice.igst_amount)}</Text>
                        <Text style={[styles.tableCellLast, styles.right, styles.bold, { width: 55 }]}>{fmtN(invoice.total)}</Text>
                    </View>
                </View>

                {/* Amount in Words */}
                <View style={[{ border: '1 solid #000', borderTop: 'none', padding: 5 }]}>
                    <Text>Amount Chargeable (in words)</Text>
                    <Text style={styles.bold}>INR {numberToWords(Math.round(invoice.total))}</Text>
                </View>

                {/* GST Table */}
                <View style={[{ border: '1 solid #000', borderTop: 'none', width: '60%', marginTop: 8 }]}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.pad, styles.borderRight, styles.borderBottom, styles.center, { flex: 1 }]}>HSN/SAC</Text>
                        <Text style={[styles.pad, styles.borderRight, styles.borderBottom, styles.center, { width: 60 }]}>Taxable</Text>
                        <View style={[styles.borderRight, { width: 80 }]}>
                            <Text style={[styles.pad, styles.borderBottom, styles.center, { flex: 1 }]}>Central Tax</Text>
                            <View style={styles.row}>
                                <Text style={[styles.pad, styles.borderRight, styles.center, { width: '50%' }]}>Rate</Text>
                                <Text style={[styles.pad, styles.center, { width: '50%' }]}>Amt</Text>
                            </View>
                        </View>
                        <View style={[styles.borderRight, { width: 80 }]}>
                            <Text style={[styles.pad, styles.borderBottom, styles.center, { flex: 1 }]}>State Tax</Text>
                            <View style={styles.row}>
                                <Text style={[styles.pad, styles.borderRight, styles.center, { width: '50%' }]}>Rate</Text>
                                <Text style={[styles.pad, styles.center, { width: '50%' }]}>Amt</Text>
                            </View>
                        </View>
                        <Text style={[styles.pad, styles.center, styles.borderBottom, { width: 60 }]}>Total Tax</Text>
                    </View>

                    {hsnRows.map(([hsn, data], idx) => (
                        <View style={[styles.row, { borderBottom: idx === hsnRows.length - 1 ? 'none' : '1 solid #000' }]} key={hsn}>
                            <Text style={[styles.pad, styles.borderRight, { flex: 1 }]}>{hsn}</Text>
                            <Text style={[styles.pad, styles.borderRight, styles.right, { width: 60 }]}>{fmtN(data.taxable)}</Text>
                            <Text style={[styles.pad, styles.borderRight, styles.center, { width: 40 }]}>{fmtN(data.rate / 2)}%</Text>
                            <Text style={[styles.pad, styles.borderRight, styles.right, { width: 40 }]}>{fmtN(data.cgst)}</Text>
                            <Text style={[styles.pad, styles.borderRight, styles.center, { width: 40 }]}>{fmtN(data.rate / 2)}%</Text>
                            <Text style={[styles.pad, styles.borderRight, styles.right, { width: 40 }]}>{fmtN(data.sgst)}</Text>
                            <Text style={[styles.pad, styles.right, { width: 60 }]}>{fmtN(data.cgst + data.sgst + data.igst)}</Text>
                        </View>
                    ))}

                    <View style={[styles.row, styles.borderTop, styles.bold]}>
                        <Text style={[styles.pad, styles.borderRight, { flex: 1 }]}>Total</Text>
                        <Text style={[styles.pad, styles.borderRight, styles.right, { width: 60 }]}>{fmtN(invoice.subtotal)}</Text>
                        <Text style={[styles.pad, styles.borderRight, { width: 40 }]} />
                        <Text style={[styles.pad, styles.borderRight, styles.right, { width: 40 }]}>{fmtN(invoice.cgst_amount)}</Text>
                        <Text style={[styles.pad, styles.borderRight, { width: 40 }]} />
                        <Text style={[styles.pad, styles.borderRight, styles.right, { width: 40 }]}>{fmtN(invoice.sgst_amount)}</Text>
                        <Text style={[styles.pad, styles.right, { width: 60 }]}>{fmtN(parseFloat(invoice.cgst_amount) + parseFloat(invoice.sgst_amount))}</Text>
                    </View>
                </View>

                <Text style={{ fontSize: 8, marginTop: 4 }}>Tax Amount (in words) : <Text style={styles.bold}>INR {numberToWords(parseFloat(invoice.cgst_amount) + parseFloat(invoice.sgst_amount) + parseFloat(invoice.igst_amount))}</Text></Text>

                {/* Footer */}
                <View style={[styles.footerSection, { marginTop: 8 }]}>
                    <View style={[styles.pad, styles.borderRight, { flex: 1 }]}>
                        <Text style={styles.bold}>Company's Bank Details</Text>
                        <Text>Bank Name: <Text style={styles.bold}>{settings.bank_name || 'N/A'}</Text></Text>
                        <Text>A/c No.: <Text style={styles.bold}>{settings.bank_account_no || 'N/A'}</Text></Text>
                        <Text>Branch & IFSC Code: <Text style={styles.bold}>{settings.bank_branch || ''} & {settings.bank_ifsc || ''}</Text></Text>

                        <View style={{ marginTop: 8 }}>
                            <Text style={[styles.bold, { textDecoration: 'underline' }]}>Declaration</Text>
                            <Text style={{ fontSize: 8 }}>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</Text>
                        </View>
                        <Text style={[styles.bold, { marginTop: 8 }]}>PAN No: {settings.company_pan || 'N/A'}</Text>
                    </View>

                    <View style={[styles.pad, styles.right, { width: 220 }]}>
                        <Text style={{ fontSize: 8 }}>for {settings.store_name || 'YOUR COMPANY NAME'}</Text>
                        {settings.signature_stamp_url ? (
                            <Image src={settings.signature_stamp_url} style={{ maxHeight: 60, marginTop: 10, alignSelf: 'flex-end' }} />
                        ) : (
                            <View style={{ height: 60 }} />
                        )}
                        <Text style={[styles.bold, { marginTop: 'auto' }]}>Authorized Signatory</Text>
                    </View>
                </View>

                <Text style={[styles.center, { fontSize: 8, marginTop: 4 }]}>This is a Computer Generated Invoice</Text>

            </Page>
        </Document>
    );
};
