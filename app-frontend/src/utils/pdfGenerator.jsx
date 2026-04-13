import React from 'react';
import api from '../api';
import { SalesInvoicePDF } from '../components/pdf/SalesInvoicePDF';
import { SalesQuotationPDF } from '../components/pdf/SalesQuotationPDF';
import { SalesOrderPDF } from '../components/pdf/SalesOrderPDF';
import { PurchaseOrderPDF } from '../components/pdf/PurchaseOrderPDF';
import { PurchaseInvoicePDF } from '../components/pdf/PurchaseInvoicePDF';

const fetchSettings = async () => {
    try {
        const res = await api.get('/admin/settings');
        return res.data;
    } catch (err) {
        console.error("Failed to fetch settings", err);
        return {};
    }
};

export const generateSalesInvoicePDF = async (invoice) => {
    const settings = await fetchSettings();
    return <SalesInvoicePDF invoice={invoice} settings={settings} />;
};

export const generateSalesQuotationPDF = async (quot) => {
    const settings = await fetchSettings();
    return <SalesQuotationPDF quot={quot} settings={settings} />;
};

export const generateSalesOrderPDF = async (order) => {
    const settings = await fetchSettings();
    return <SalesOrderPDF order={order} settings={settings} />;
};

export const generatePurchaseOrderPDF = async (po) => {
    const settings = await fetchSettings();
    return <PurchaseOrderPDF po={po} settings={settings} />;
};

export const generatePurchaseInvoicePDF = async (inv) => {
    const settings = await fetchSettings();
    return <PurchaseInvoicePDF inv={inv} settings={settings} />;
};
