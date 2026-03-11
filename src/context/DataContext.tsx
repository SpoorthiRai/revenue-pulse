import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';

// ========== Types ==========
export interface Enquiry {
  leadNumber: string;
  leadName: string;
  company: string;
  contact: string;
  pillar: string;
  subCategory: string;
  assignedTo: string;
  source: string;
  status: string;
  comments: string;
  createdDate: string;
}

export interface Deal {
  dealId: string;
  company: string;
  contact: string;
  pillar: string;
  expectedAmount: number;
  negotiatedAmount: number;
  closeDate: string;
  stage: string;
  assignedTo: string;
  comments: string;
}

export interface PO {
  poNumber: string;
  dealId: string;
  customer: string;
  company: string;
  gstNumber: string;
  serviceCategory: string;
  serviceDescription: string;
  poDate: string;
  startDate: string;
  endDate: string;
  duration: number;
  quantity: number;
  totalValue: number;
  monthlyBilling: number;
  billingTerms: string;
  advancePercent: number;
  milestones: string;
  assignedTo: string;
  status: string;
  validated: string;
}

export interface Invoice {
  invoiceNumber: string;
  poNumber: string;
  customer: string;
  amount: number;
  invoiceDate: string;
  dueDate: string;
  status: string;
  cfoApproval: string;
  amountReceived: number;
  receivedDate: string | null;
  balance: number;
}

interface DataContextType {
  enquiryData: Enquiry[];
  dealData: Deal[];
  poData: PO[];
  invoiceData: Invoice[];
  refreshData: () => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

// ========== Excel date parsing ==========
function excelDateToString(val: any): string {
  if (!val) return '';
  // If it's already a string that looks like a date
  if (typeof val === 'string') {
    // Handle "22-Aug-2025" or "2025-08-22" or "01-Oct-2025" etc.
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return formatDate(d);
    }
    return val;
  }
  // Excel serial number
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      return formatDate(new Date(d.y, d.m - 1, d.d));
    }
  }
  return String(val);
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[₹,\s]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function parsePercent(val: any): number {
  if (typeof val === 'number') {
    // xlsx sometimes returns percentages as decimals (0.1 for 10%)
    if (val > 0 && val <= 1) return val * 100;
    return val;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[%\\s]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// ========== Parsing functions ==========
function parseEnquirySheet(ws: XLSX.WorkSheet): Enquiry[] {
  const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
  return data
    .filter((row: any) => {
      const leadNum = row['Lead Number'] || row['lead_number'] || '';
      return leadNum && typeof leadNum === 'string' && leadNum.startsWith('L') && !leadNum.includes('💡');
    })
    .map((row: any) => ({
      leadNumber: String(row['Lead Number'] || ''),
      leadName: String(row['Lead Name'] || ''),
      company: String(row['Company Name'] || ''),
      contact: String(row['Contact Name'] || ''),
      pillar: String(row['Service Pillar'] || ''),
      subCategory: String(row['Sub Category'] || ''),
      assignedTo: String(row['Assigned To'] || ''),
      source: String(row['Lead Source'] || ''),
      status: String(row['Status'] || ''),
      comments: String(row['Comments'] || ''),
      createdDate: excelDateToString(row['Created Date']),
    }));
}

function parseDealSheet(ws: XLSX.WorkSheet): Deal[] {
  const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
  const seen = new Set<string>();
  return data
    .filter((row: any) => {
      const dealId = String(row['Deal ID\r\n(Lead No.)'] || row['Deal ID (Lead No.)'] || row['Deal ID\n(Lead No.)'] || '');
      return dealId && dealId.startsWith('L') && !dealId.includes('💡');
    })
    .map((row: any) => {
      // Try multiple possible header names
      const dealId = String(row['Deal ID\r\n(Lead No.)'] || row['Deal ID (Lead No.)'] || row['Deal ID\n(Lead No.)'] || '');
      return {
        dealId,
        company: String(row['Company Name'] || ''),
        contact: String(row['Contact Name'] || ''),
        pillar: String(row['Service Pillar'] || ''),
        expectedAmount: parseNumber(row['Expected Amount']),
        negotiatedAmount: parseNumber(row['Negotiated Amount']),
        closeDate: excelDateToString(row['Expected Close Date']),
        stage: String(row['Sales Stage'] || ''),
        assignedTo: String(row['Assigned To'] || ''),
        comments: String(row['Comments'] || ''),
      };
    })
    .filter(d => {
      // Remove duplicates - keep first occurrence
      const key = `${d.dealId}-${d.stage}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function parsePOSheet(ws: XLSX.WorkSheet): PO[] {
  const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
  return data
    .filter((row: any) => {
      const poNum = row['PO Number'] || '';
      return poNum && typeof poNum === 'string' && poNum.startsWith('PO-');
    })
    .map((row: any) => ({
      poNumber: String(row['PO Number'] || ''),
      dealId: String(row['Source Deal ID\r\n← Enter Here'] || row['Source Deal ID'] || row['Source Deal ID\n← Enter Here'] || ''),
      customer: String(row['Customer Name'] || ''),
      company: String(row['Company'] || row['Customer Name'] || ''),
      gstNumber: String(row['GST Number'] || ''),
      serviceCategory: String(row['Service Category'] || ''),
      serviceDescription: String(row['Service Description'] || ''),
      poDate: excelDateToString(row['PO Date']),
      startDate: excelDateToString(row['Start Date']),
      endDate: excelDateToString(row['End Date']),
      duration: parseNumber(row['Duration\r\n(Months)'] || row['Duration (Months)'] || row['Duration\n(Months)'] || 0),
      quantity: parseNumber(row['Quantity'] || 0),
      totalValue: parseNumber(row['Total PO Value']),
      monthlyBilling: parseNumber(row['PO Monthly Billing']),
      billingTerms: String(row['Billing Terms'] || ''),
      advancePercent: parsePercent(row['Advance %'] || 0),
      milestones: String(row['Milestone Details'] || ''),
      assignedTo: String(row['Assigned\r\nSales Owner'] || row['Assigned Sales Owner'] || row['Assigned\nSales Owner'] || ''),
      status: String(row['PO Status'] || ''),
      validated: String(row['Validated\r\n(Yes/No)'] || row['Validated (Yes/No)'] || row['Validated\n(Yes/No)'] || ''),
    }));
}

// Generate invoice data from POs (since no invoice sheet in Excel)
function generateInvoiceData(poData: PO[]): Invoice[] {
  const invoices: Invoice[] = [];
  let invCounter = 1;
  const today = new Date('2026-03-11');

  for (const po of poData) {
    if (!po.startDate || !po.endDate) continue;
    const start = new Date(po.startDate);
    const end = new Date(po.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

    if (po.billingTerms === 'Monthly') {
      let current = new Date(start);
      while (current <= end) {
        const invoiceDate = formatDate(current);
        const dueDate = new Date(current);
        dueDate.setDate(dueDate.getDate() + 30);
        const dueDateStr = formatDate(dueDate);

        const isPaid = dueDate < today && current < new Date('2026-02-01');
        const isSent = !isPaid && dueDate < new Date(today.getTime() + 30 * 86400000);

        let status: string;
        let cfoApproval: string;
        let amountReceived: number;
        let receivedDate: string | null;
        let balance: number;

        if (isPaid) {
          status = 'Paid';
          cfoApproval = 'Approved';
          amountReceived = po.monthlyBilling;
          const rd = new Date(dueDate);
          rd.setDate(rd.getDate() - 2);
          receivedDate = formatDate(rd);
          balance = 0;
        } else if (isSent) {
          status = 'Invoice Sent';
          cfoApproval = 'Approved';
          amountReceived = 0;
          receivedDate = null;
          balance = po.monthlyBilling;
        } else {
          status = 'Draft';
          cfoApproval = 'Pending';
          amountReceived = 0;
          receivedDate = null;
          balance = po.monthlyBilling;
        }

        invoices.push({
          invoiceNumber: `INV-${String(invCounter++).padStart(3, '0')}`,
          poNumber: po.poNumber,
          customer: po.customer,
          amount: po.monthlyBilling,
          invoiceDate,
          dueDate: dueDateStr,
          status,
          cfoApproval,
          amountReceived,
          receivedDate,
          balance,
        });

        current.setMonth(current.getMonth() + 1);
      }
    } else if (po.billingTerms === 'Milestone') {
      // Split into milestones based on quantity or default 3
      const numMilestones = po.quantity || 3;
      const perMilestone = po.totalValue / numMilestones;
      const totalMonths = po.duration || 6;
      const monthsPerMilestone = Math.floor(totalMonths / numMilestones);

      for (let m = 0; m < numMilestones; m++) {
        const milestoneDate = new Date(start);
        milestoneDate.setMonth(milestoneDate.getMonth() + m * monthsPerMilestone);
        const invoiceDate = formatDate(milestoneDate);
        const dueDate = new Date(milestoneDate);
        dueDate.setDate(dueDate.getDate() + 30);
        const dueDateStr = formatDate(dueDate);

        const isPaid = dueDate < today && milestoneDate < new Date('2026-02-01');
        const isSent = !isPaid && dueDate < new Date(today.getTime() + 30 * 86400000);

        let status: string;
        let cfoApproval: string;
        let amountReceived: number;
        let receivedDate: string | null;
        let balance: number;

        if (isPaid) {
          status = 'Paid';
          cfoApproval = 'Approved';
          amountReceived = perMilestone;
          const rd = new Date(dueDate);
          rd.setDate(rd.getDate() - 2);
          receivedDate = formatDate(rd);
          balance = 0;
        } else if (isSent) {
          status = 'Invoice Sent';
          cfoApproval = 'Approved';
          amountReceived = 0;
          receivedDate = null;
          balance = perMilestone;
        } else {
          status = 'Draft';
          cfoApproval = 'Pending';
          amountReceived = 0;
          receivedDate = null;
          balance = perMilestone;
        }

        invoices.push({
          invoiceNumber: `INV-${String(invCounter++).padStart(3, '0')}`,
          poNumber: po.poNumber,
          customer: po.customer,
          amount: perMilestone,
          invoiceDate,
          dueDate: dueDateStr,
          status,
          cfoApproval,
          amountReceived,
          receivedDate,
          balance,
        });
      }
    } else if (po.billingTerms === 'Quarterly') {
      let current = new Date(start);
      while (current <= end) {
        const quarterlyAmount = po.totalValue / (po.quantity || 4);
        const invoiceDate = formatDate(current);
        const dueDate = new Date(current);
        dueDate.setDate(dueDate.getDate() + 30);
        const dueDateStr = formatDate(dueDate);

        const isPaid = dueDate < today && current < new Date('2026-02-01');
        const isSent = !isPaid && dueDate < new Date(today.getTime() + 30 * 86400000);

        invoices.push({
          invoiceNumber: `INV-${String(invCounter++).padStart(3, '0')}`,
          poNumber: po.poNumber,
          customer: po.customer,
          amount: quarterlyAmount,
          invoiceDate,
          dueDate: dueDateStr,
          status: isPaid ? 'Paid' : isSent ? 'Invoice Sent' : 'Pending',
          cfoApproval: isPaid ? 'Approved' : isSent ? 'Approved' : 'Pending',
          amountReceived: isPaid ? quarterlyAmount : 0,
          receivedDate: isPaid ? formatDate(new Date(dueDate.getTime() - 2 * 86400000)) : null,
          balance: isPaid ? 0 : quarterlyAmount,
        });

        current.setMonth(current.getMonth() + 3);
      }
    }
  }

  return invoices;
}

// ========== Main fetch & parse ==========
async function fetchAndParseExcel(): Promise<{
  enquiryData: Enquiry[];
  dealData: Deal[];
  poData: PO[];
  invoiceData: Invoice[];
}> {
  const response = await fetch('/data/Deal_to_Billing_Populated.xlsx');
  const arrayBuffer = await response.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });

  // Sheet indices based on the Excel structure:
  // 0: Dropdowns, 1: Enquiry, 2: Deal_Pipeline, 3: PO_Workflow, 4: Input_PO, 5: Contacts
  const sheetNames = wb.SheetNames;

  // Find sheets by trying known names or by index
  const enquirySheet = wb.Sheets[sheetNames[1]]; // Enquiry sheet
  const dealSheet = wb.Sheets[sheetNames[2]]; // Deal_Pipeline sheet
  const poSheet = wb.Sheets[sheetNames[4]]; // Input_PO sheet

  const enquiryData = enquirySheet ? parseEnquirySheet(enquirySheet) : [];
  const dealData = dealSheet ? parseDealSheet(dealSheet) : [];
  const poData = poSheet ? parsePOSheet(poSheet) : [];
  const invoiceData = generateInvoiceData(poData);

  return { enquiryData, dealData, poData, invoiceData };
}

// ========== Provider ==========
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [enquiryData, setEnquiryData] = useState<Enquiry[]>([]);
  const [dealData, setDealData] = useState<Deal[]>([]);
  const [poData, setPOData] = useState<PO[]>([]);
  const [invoiceData, setInvoiceData] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAndParseExcel();
      setEnquiryData(data.enquiryData);
      setDealData(data.dealData);
      setPOData(data.poData);
      setInvoiceData(data.invoiceData);
    } catch (err) {
      console.error('Failed to parse Excel data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DataContext.Provider value={{ enquiryData, dealData, poData, invoiceData, refreshData: loadData, isLoading }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
