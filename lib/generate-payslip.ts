

import { jsPDF } from "jspdf"
import fslogo from "../public/FSLOGO.webp"

interface EmployeeData {
  [key: string]: string | number
}

export async function generatePayslipPDF(employee: any): Promise<Buffer> {
  const doc = new jsPDF()

  const safeText = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return ""
    return String(value)
  }

  const formatNumber = (value: number | string | undefined | null): string => {
    if (value === undefined || value === null) return "0.00"
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue as number)) return "0.00"
    return Number(numValue).toFixed(2)
  }

  // Colors matching the template
  const tealColor: [number, number, number] = [13, 148, 136]
  const darkGray: [number, number, number] = [51, 51, 51]
  const lightGray: [number, number, number] = [128, 128, 128]

  // Helper function to get field value with case-insensitive matching and fallbacks
  const getField = (fieldName: string): string | number => {
    const lowerFieldName = fieldName.toLowerCase()
    
    // Try exact match first
    for (const key in employee) {
      if (key.toLowerCase() === lowerFieldName) {
        return employee[key]
      }
    }
    
    // Try partial matches for common fields
    if (lowerFieldName.includes("employee")) {
      for (const key in employee) {
        if (key.toLowerCase().includes("employee") && key.toLowerCase().includes("id")) {
          return employee[key]
        }
      }
    }
    
    if (lowerFieldName.includes("first")) {
      for (const key in employee) {
        if (key.toLowerCase().includes("first") && key.toLowerCase().includes("name")) {
          return employee[key]
        }
      }
    }
    
    if (lowerFieldName.includes("last")) {
      for (const key in employee) {
        if (key.toLowerCase().includes("last") && key.toLowerCase().includes("name")) {
          return employee[key]
        }
      }
    }
    
    if (lowerFieldName.includes("middle")) {
      for (const key in employee) {
        if (key.toLowerCase().includes("middle") && key.toLowerCase().includes("name")) {
          return employee[key]
        }
      }
    }
    
    if (lowerFieldName.includes("job") || lowerFieldName.includes("title")) {
      for (const key in employee) {
        if (key.toLowerCase().includes("job") || key.toLowerCase().includes("title")) {
          return employee[key]
        }
      }
    }
    
    if (lowerFieldName.includes("date from")) {
      for (const key in employee) {
        if (key.toLowerCase().includes("date") && key.toLowerCase().includes("from")) {
          return employee[key]
        }
      }
    }
    
    if (lowerFieldName.includes("date to")) {
      for (const key in employee) {
        if (key.toLowerCase().includes("date") && key.toLowerCase().includes("to")) {
          return employee[key]
        }
      }
    }
    
    if (lowerFieldName.includes("date payment")) {
      for (const key in employee) {
        if (key.toLowerCase().includes("date") && key.toLowerCase().includes("payment")) {
          return employee[key]
        }
      }
    }
    
    return ""
  }


  // Payslip Title
  doc.setFontSize(20)
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFont("helvetica", "bold")
  doc.text("Payslip", 105, 52, { align: "center" })

  // Employee Information - Left Side
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text(safeText(getField("employee id")), 20, 65)
  doc.setFont("helvetica", "normal")
  doc.text(
    `${safeText(getField("first name"))} ${safeText(getField("middle name"))} ${safeText(getField("last name"))}`,
    20,
    70,
  )
  doc.text(safeText(getField("job title")), 20, 75)

  // Pay Period Information - Right Side (Hire Date removed)
  doc.setFont("helvetica", "bold")
  doc.text("Pay Period:", 130, 65)
  doc.setFont("helvetica", "normal")
  doc.text(`${safeText(getField("date from"))} to ${safeText(getField("date to"))}`, 165, 65)

  doc.setFont("helvetica", "bold")
  doc.text("Pay Day:", 130, 70)
  doc.setFont("helvetica", "normal")
  doc.text(safeText(getField("date payment")), 165, 70)

  // Earnings Section
  let yPos = 90
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Earnings", 20, yPos)
  doc.text("Amount", 170, yPos)

  // Line under header
  doc.setDrawColor(200, 200, 200)
  doc.line(20, yPos + 2, 190, yPos + 2)

  yPos += 8
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")

  // Earnings items - using the actual field names from your CSV
  const earnings = [
    { label: "Basic Pay", field: "basic pay" },
    { label: "Regular OT", field: "regular ot" },
    { label: "Special Holiday Premium Pay", field: "special holiday premium pay" },
    { label: "Regular Holiday Premium Pay", field: "regular holiday premium pay" },
    { label: "Night Differential", field: "night differential" },
    { label: "Transportation Allowance", field: "transportation allowance" },
    { label: "Other Pay (Taxable)", field: "other pay (taxable)" },
    { label: "Spot Bonus", field: "spot bonus" },
    { label: "Rest Day OT", field: "rest day ot" },
  ]

  earnings.forEach((item) => {
    const value = getField(item.field)
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (numValue !== 0 && !isNaN(numValue as number)) {
      doc.text(item.label, 20, yPos)
      doc.text(formatNumber(value), 190, yPos, { align: "right" })
      yPos += 5
    }
  })

  // Total Earnings
  yPos += 3
  doc.setFont("helvetica", "bold")
  doc.line(20, yPos - 2, 190, yPos - 2)
  doc.text("Total Earnings:", 20, yPos)
  doc.text(formatNumber(getField("total earnings")), 190, yPos, { align: "right" })

  // Deductions Section
  yPos += 12
  doc.setFontSize(10)
  doc.text("Deductions", 20, yPos)
  doc.text("Amount", 170, yPos)

  doc.line(20, yPos + 2, 190, yPos + 2)

  yPos += 8
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")

  // Deductions items - using the actual field names from your CSV
  const deductions = [
    { label: "Absences", field: "absences" },
    { label: "Undertime/Tardiness", field: "undertime/tardiness" },
    { label: "SSS (EE)", field: "sss (ee)" },
    { label: "HDMF (EE)", field: "hdmf (ee)" },
    { label: "PHIC (EE)", field: "phic (ee)" },
    { label: "SSS Loan", field: "sss loan" },
    { label: "HDMF Loan", field: "hdmf loan" },
    { label: "Salary Loan Repayment", field: "salary loan repayment" },
  ]

  deductions.forEach((item) => {
    const value = getField(item.field)
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    // For deductions, we check if the value is not zero (they're typically negative numbers)
    if (numValue !== 0 && !isNaN(numValue as number)) {
      doc.text(item.label, 20, yPos)
      // For deductions, we might want to show absolute value or keep negative
      doc.text(formatNumber(value), 190, yPos, { align: "right" })
      yPos += 5
    }
  })

  // Total Deductions
  yPos += 3
  doc.setFont("helvetica", "bold")
  doc.line(20, yPos - 2, 190, yPos - 2)
  doc.text("Total Deductions:", 20, yPos)
  doc.text(formatNumber(getField("total deductions")), 190, yPos, { align: "right" })

  // Take Home Pay
  yPos += 15
  doc.setFontSize(14)
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.text("Take Home Pay:", 105, yPos, { align: "center" })

  yPos += 8
  doc.setFontSize(20)
  doc.setTextColor(tealColor[0], tealColor[1], tealColor[2])
  doc.text(formatNumber(getField("net pay")), 105, yPos, { align: "center" })

  // Notes Section
  yPos += 15
  doc.setFontSize(10)
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFont("helvetica", "bold")
  doc.text("Notes:", 20, yPos)

  yPos += 8
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2])
  doc.text("This is a system generated payslip.", 105, yPos, { align: "center" })

  // Convert to buffer
  const pdfOutput = doc.output("arraybuffer")
  return Buffer.from(pdfOutput)
}