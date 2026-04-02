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
  dataWarnings: string[];
}

const DataContext = createContext<DataContextType | null>(null);

// ========== Helpers ==========
function safeDateString(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return formatDate(d);
    return val;
  }
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return formatDate(new Date(d.y, d.m - 1, d.d));
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return formatDate(val);
  }
  return String(val);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[₹,\s]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// ========== Lead stages vs Deal stages ==========
const LEAD_STAGES = new Set([
  'Lead Generation', 'Lead Qualification', 'First Contact',
  'Discovery Meeting', 'Approach or Demo', 'Converted',
]);

const DEAL_STAGES = new Set([
  'Commercial Proposal', 'Negotiation', 'Win', 'Lost',
  'Cancel', 'Cancelled', 'Closed',
]);

// ========== Sheet 1: Lead - Deal ==========
function parseLeadDealSheet(ws: XLSX.WorkSheet): { enquiries: Enquiry[]; deals: Deal[] } {
  const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
  const enquiries: Enquiry[] = [];
  const deals: Deal[] = [];

  for (const row of data) {
    const leadNumber = String(row['Lead Number'] || '');
    if (!leadNumber.startsWith('L')) continue;

    const salesStage = String(row['Sales Stage'] || '').trim();
    const recordType = String(row['Status'] || '').trim();
    const company = String(row['Company name '] || row['Company name'] || '');
    const contact = String(row['Contact Names'] || '');
    const pillar = String(row['Service Pillar'] || '');
    const subCategory = String(row['Sub-Categories'] || '');
    const assignedTo = String(row['Assigned To'] || '');
    const source = String(row['Lead Source'] || '');
    const comments = String(row['Comment'] || '');
    const expectedAmount = parseNumber(row['Expected Amount(₹)']);
    const negotiatedAmount = parseNumber(row['Final Negotiated Amount(₹)']);
    const createdLeadDate = safeDateString(row['Created Lead At']);
    const createdDealDate = safeDateString(row['Created Deal Date']);
    const closeDate = safeDateString(row['Expected Close Date']);

    // Determine if this row is a lead or deal
    const isLead = recordType === 'Lead' || LEAD_STAGES.has(salesStage);
    const isDeal = recordType === 'Deal' || DEAL_STAGES.has(salesStage);

    // Always add to enquiryData (all rows are leads at some point)
    enquiries.push({
      leadNumber,
      leadName: String(row['Lead Name'] || ''),
      company,
      contact,
      pillar,
      subCategory,
      assignedTo,
      source,
      // Use salesStage as status so "Converted" check works
      status: salesStage || recordType,
      comments,
      createdDate: createdLeadDate,
    });

    // Add to dealData if it's a deal
    if (isDeal) {
      deals.push({
        dealId: leadNumber,
        company,
        contact,
        pillar,
        expectedAmount,
        negotiatedAmount,
        closeDate: closeDate || createdDealDate,
        stage: salesStage,
        assignedTo,
        comments,
      });
    }
  }

  return { enquiries, deals };
}

// ========== Sheet 2: PO_Workflow ==========
function parsePOWorkflowSheet(ws: XLSX.WorkSheet): PO[] {
  const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
  const today = new Date();

  return data.map((row: any) => {
    const expiry = safeDateString(row['Expiry']);
    let status = 'Active';
    if (expiry) {
      const expiryDate = new Date(expiry);
      if (!isNaN(expiryDate.getTime()) && expiryDate < today) {
        status = 'Completed';
      }
    }

    const poRaw = String(row['PO'] || '-');
    const poNumber = poRaw === '-' ? '' : poRaw;
    const totalValue = parseNumber(row['Total value']);
    const monthlyBilling = parseNumber(row['Value per Invoice']);

    const startDate = safeDateString(row['Start Date']);
    const endDate = safeDateString(row['End Date']);
    const poDate = String(row['PO Date'] || '');

    return {
      poNumber: poNumber || `PO-${row['Customer']?.slice(0, 8) || 'UNK'}`,
      dealId: '',
      customer: String(row['Customer'] || ''),
      company: String(row['Billing Entity'] || row['Customer'] || ''),
      gstNumber: '',
      serviceCategory: String(row['Service'] || ''),
      serviceDescription: String(row['Service'] || ''),
      poDate: poDate === '-' ? '' : safeDateString(poDate),
      startDate,
      endDate,
      duration: 0,
      quantity: 0,
      totalValue,
      monthlyBilling,
      billingTerms: String(row['Billing Cycle'] || ''),
      advancePercent: 0,
      milestones: String(row['Billing Due'] || ''),
      assignedTo: '',
      status,
      validated: String(row['Agreement'] || ''),
    };
  });
}

// ========== Invoice generation from POs ==========
function generateInvoiceData(poData: PO[]): Invoice[] {
  const invoices: Invoice[] = [];
  let invCounter = 1;
  const today = new Date();

  for (const po of poData) {
    if (!po.startDate && !po.poDate) continue;
    const start = new Date(po.startDate || po.poDate);
    const end = po.endDate ? new Date(po.endDate) : new Date(start.getTime() + 365 * 86400000);
    if (isNaN(start.getTime())) continue;

    if (po.billingTerms === 'Monthly' && po.monthlyBilling > 0) {
      let current = new Date(start);
      const limit = isNaN(end.getTime()) ? new Date(start.getTime() + 365 * 86400000) : end;
      while (current <= limit) {
        const invoiceDate = formatDate(current);
        const dueDate = new Date(current);
        dueDate.setDate(dueDate.getDate() + 30);
        const dueDateStr = formatDate(dueDate);
        const isPaid = dueDate < today && current < new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const isSent = !isPaid && dueDate < new Date(today.getTime() + 30 * 86400000);

        invoices.push({
          invoiceNumber: `INV-${String(invCounter++).padStart(3, '0')}`,
          poNumber: po.poNumber,
          customer: po.customer,
          amount: po.monthlyBilling,
          invoiceDate,
          dueDate: dueDateStr,
          status: isPaid ? 'Paid' : isSent ? 'Invoice Sent' : 'Draft',
          cfoApproval: isPaid || isSent ? 'Approved' : 'Pending',
          amountReceived: isPaid ? po.monthlyBilling : 0,
          receivedDate: isPaid ? formatDate(new Date(dueDate.getTime() - 2 * 86400000)) : null,
          balance: isPaid ? 0 : po.monthlyBilling,
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else if (po.billingTerms === 'Quarterly' && po.monthlyBilling > 0) {
      let current = new Date(start);
      const limit = isNaN(end.getTime()) ? new Date(start.getTime() + 365 * 86400000) : end;
      while (current <= limit) {
        const invoiceDate = formatDate(current);
        const dueDate = new Date(current);
        dueDate.setDate(dueDate.getDate() + 30);
        const dueDateStr = formatDate(dueDate);
        const isPaid = dueDate < today && current < new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const isSent = !isPaid && dueDate < new Date(today.getTime() + 30 * 86400000);

        invoices.push({
          invoiceNumber: `INV-${String(invCounter++).padStart(3, '0')}`,
          poNumber: po.poNumber,
          customer: po.customer,
          amount: po.monthlyBilling,
          invoiceDate,
          dueDate: dueDateStr,
          status: isPaid ? 'Paid' : isSent ? 'Invoice Sent' : 'Pending',
          cfoApproval: isPaid || isSent ? 'Approved' : 'Pending',
          amountReceived: isPaid ? po.monthlyBilling : 0,
          receivedDate: isPaid ? formatDate(new Date(dueDate.getTime() - 2 * 86400000)) : null,
          balance: isPaid ? 0 : po.monthlyBilling,
        });
        current.setMonth(current.getMonth() + 3);
      }
    } else if (po.billingTerms === 'One-time' && po.totalValue > 0) {
      const invoiceDate = formatDate(start);
      const dueDate = new Date(start);
      dueDate.setDate(dueDate.getDate() + 30);
      const isPaid = dueDate < today;

      invoices.push({
        invoiceNumber: `INV-${String(invCounter++).padStart(3, '0')}`,
        poNumber: po.poNumber,
        customer: po.customer,
        amount: po.totalValue,
        invoiceDate,
        dueDate: formatDate(dueDate),
        status: isPaid ? 'Paid' : 'Invoice Sent',
        cfoApproval: 'Approved',
        amountReceived: isPaid ? po.totalValue : 0,
        receivedDate: isPaid ? formatDate(new Date(dueDate.getTime() - 2 * 86400000)) : null,
        balance: isPaid ? 0 : po.totalValue,
      });
    }
  }

  return invoices;
}

// ========== Sanity checks ==========
function runSanityChecks(enquiries: Enquiry[], deals: Deal[], poData: PO[]): string[] {
  const warnings: string[] = [];
  const uniqueLeads = new Set(enquiries.map(e => e.leadNumber)).size;
  if (uniqueLeads !== 54) warnings.push(`Expected 54 unique leads, got ${uniqueLeads}`);

  const statusLead = enquiries.filter(e => {
    const stage = e.status;
    return LEAD_STAGES.has(stage) || stage === 'Lead Generation' || stage === 'Lead Qualification';
  });
  // Check by original Status field — we stored salesStage in status, so check differently
  // Count rows where original Status = "Lead" — we can approximate by non-deal stages
  const leadCount = enquiries.filter(e => !DEAL_STAGES.has(e.status)).length;
  if (leadCount !== 24) warnings.push(`Expected 24 Lead-status records, got ${leadCount}`);

  const dealCount = enquiries.filter(e => DEAL_STAGES.has(e.status)).length;
  if (dealCount !== 29) warnings.push(`Expected 29 Deal-status records, got ${dealCount}`);

  const winCount = deals.filter(d => d.stage === 'Win').length;
  if (winCount !== 11) warnings.push(`Expected 11 Win deals, got ${winCount}`);

  const revenueWon = deals.filter(d => d.stage === 'Win').reduce((s, d) => s + d.negotiatedAmount, 0);
  if (Math.abs(revenueWon - 13080000) > 10000) warnings.push(`Expected revenue ≈₹1.31Cr, got ₹${revenueWon}`);

  if (poData.length !== 18) warnings.push(`Expected 18 PO rows, got ${poData.length}`);

  const pillars = new Set(enquiries.map(e => e.pillar).filter(Boolean));
  const expectedPillars = ['Marketing', 'PreSales', 'Consulting', 'PostSales', 'Growth Consulting', 'Software Dev', 'Finance'];
  for (const p of expectedPillars) {
    if (!pillars.has(p)) warnings.push(`Missing service pillar: ${p}`);
  }

  return warnings;
}

// ========== Main fetch & parse ==========
async function fetchAndParseExcel(): Promise<{
  enquiryData: Enquiry[];
  dealData: Deal[];
  poData: PO[];
  invoiceData: Invoice[];
  warnings: string[];
}> {
  const response = await fetch('/data/Sales_Pipeline_v2.xlsx');
  const arrayBuffer = await response.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  const sheetNames = wb.SheetNames;

  // Sheet 1: "Lead - Deal"
  const leadDealSheet = wb.Sheets[sheetNames[0]];
  const { enquiries, deals } = leadDealSheet ? parseLeadDealSheet(leadDealSheet) : { enquiries: [], deals: [] };

  // Sheet 2: "PO_Workflow"
  const poSheet = wb.Sheets[sheetNames[1]];
  const poData = poSheet ? parsePOWorkflowSheet(poSheet) : [];

  const invoiceData = generateInvoiceData(poData);
  const warnings = runSanityChecks(enquiries, deals, poData);

  if (warnings.length > 0) {
    console.warn('Data sanity check warnings:', warnings);
  }

  return { enquiryData: enquiries, dealData: deals, poData, invoiceData, warnings };
}

// ========== Provider ==========
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [enquiryData, setEnquiryData] = useState<Enquiry[]>([]);
  const [dealData, setDealData] = useState<Deal[]>([]);
  const [poData, setPOData] = useState<PO[]>([]);
  const [invoiceData, setInvoiceData] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataWarnings, setDataWarnings] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAndParseExcel();
      setEnquiryData(data.enquiryData);
      setDealData(data.dealData);
      setPOData(data.poData);
      setInvoiceData(data.invoiceData);
      setDataWarnings(data.warnings);
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
    <DataContext.Provider value={{ enquiryData, dealData, poData, invoiceData, refreshData: loadData, isLoading, dataWarnings }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
