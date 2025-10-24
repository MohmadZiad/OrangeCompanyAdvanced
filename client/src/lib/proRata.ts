import type { ProRataInput, ProRataResults } from "@shared/schema";

/**
 * Pro-Rata Calculator for 15-day billing cycle
 * 
 * Logic:
 * - cycleDays = 15
 * - daysUsed = clamp((endDate || invoiceDate) - activationDate, 0, cycleDays)
 * - percentageUsed = (daysUsed / cycleDays) * 100
 * - proratedAmount = (monthlyValue * daysUsed) / cycleDays
 */

export function calculateProRata(input: ProRataInput): ProRataResults {
  const {
    activationDate,
    invoiceIssueDate,
    monthlySubscriptionValue,
    fullInvoiceAmount,
    endDate,
    is15DayCycle,
  } = input;

  const cycleDays = is15DayCycle ? 15 : 30;
  
  // Calculate the end date for calculation (either custom end date or invoice date)
  const calculationEndDate = endDate || invoiceIssueDate;
  
  // Calculate days used (difference in days)
  const timeDiff = calculationEndDate.getTime() - activationDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  // Clamp days used between 0 and cycleDays
  const daysUsed = Math.max(0, Math.min(daysDiff, cycleDays));
  
  // Calculate percentage used
  const percentageUsed = (daysUsed / cycleDays) * 100;
  
  // Calculate prorated amount
  const proratedAmount = (monthlySubscriptionValue * daysUsed) / cycleDays;

  return {
    cycleDays,
    daysUsed,
    percentageUsed: Number(percentageUsed.toFixed(2)),
    proratedAmount: Number(proratedAmount.toFixed(2)),
    monthlyValue: monthlySubscriptionValue,
    fullInvoiceAmount,
    activationDate,
    invoiceIssueDate,
    endDate,
  };
}
