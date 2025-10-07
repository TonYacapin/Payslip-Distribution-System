import { jsPDF } from "jspdf"
import nodemailer from "nodemailer"

interface EmployeeData {
  [key: string]: string | number
}

interface EmailConfig {
  host: string
  port: number
  user: string
  password: string
  from: string
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  attachments: Array<{
    filename: string
    content: Buffer
  }>
  config: EmailConfig
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

  // Debug: Log all available fields to help with matching
  console.log("Available fields in employee data:", Object.keys(employee))

  // Colors matching the template
  const tealColor: [number, number, number] = [13, 148, 136]
  const darkGray: [number, number, number] = [51, 51, 51]
  const lightGray: [number, number, number] = [128, 128, 128]

  // Improved helper function to get field value with better matching
  const getField = (fieldName: string): string | number => {
    const lowerFieldName = fieldName.toLowerCase().trim()
    
    // First try exact case-insensitive match
    for (const key in employee) {
      if (key.toLowerCase().trim() === lowerFieldName) {
        console.log(`Exact match found for "${fieldName}": "${key}" = "${employee[key]}"`)
        return employee[key]
      }
    }
    
    // Try common variations and partial matches
    const variations: { [key: string]: string[] } = {
      "employee id": ["employee id", "employeeid", "emp id", "empid", "id", "employee no", "employeeno"],
      "first name": ["first name", "firstname", "fname", "given name"],
      "middle name": ["middle name", "middlename", "mname"],
      "last name": ["last name", "lastname", "lname", "surname", "family name"],
      "job title": ["job title", "jobtitle", "position", "job", "title", "designation"],
      "date from": ["date from", "datefrom", "period from", "periodfrom", "start date", "startdate"],
      "date to": ["date to", "dateto", "period to", "periodto", "end date", "enddate"],
      "date payment": ["date payment", "datepayment", "pay date", "paydate", "payment date"],
      "basic pay": ["basic pay", "basicpay", "basic", "base pay", "basepay"],
      "total earnings": ["total earnings", "totalearnings", "gross pay", "grosspay", "gross"],
      "total deductions": ["total deductions", "totaldeductions", "deductions total"],
      "net pay": ["net pay", "netpay", "take home", "takehome", "net amount"],
      "regular ot": ["regular ot", "regularot", "overtime", "ot"],
      "special holiday premium pay": ["special holiday premium pay", "special holiday", "holiday pay"],
      "regular holiday premium pay": ["regular holiday premium pay", "regular holiday", "holiday premium"],
      "night differential": ["night differential", "nightdiff", "night diff"],
      "transportation allowance": ["transportation allowance", "transportation", "transpo allowance"],
      "other pay (taxable)": ["other pay (taxable)", "other pay", "otherpay", "taxable pay"],
      "spot bonus": ["spot bonus", "spotbonus", "bonus"],
      "rest day ot": ["rest day ot", "restday ot", "rest day overtime"],
      "absences": ["absences", "absence"],
      "undertime/tardiness": ["undertime/tardiness", "undertime", "tardiness", "late"],
      "sss (ee)": ["sss (ee)", "sss", "sss ee"],
      "hdmf (ee)": ["hdmf (ee)", "hdmf", "pagibig", "pag-ibig"],
      "phic (ee)": ["phic (ee)", "phic", "philhealth"],
      "sss loan": ["sss loan", "sssloan"],
      "hdmf loan": ["hdmf loan", "hdmfloan", "pagibig loan"],
      "salary loan repayment": ["salary loan repayment", "salary loan", "loan repayment"]
    }

    if (variations[lowerFieldName]) {
      for (const variation of variations[lowerFieldName]) {
        for (const key in employee) {
          if (key.toLowerCase().trim() === variation) {
            console.log(`Variation match found for "${fieldName}": "${key}" = "${employee[key]}"`)
            return employee[key]
          }
        }
      }
    }

    // Try contains matching as last resort
    for (const key in employee) {
      const lowerKey = key.toLowerCase().trim()
      if (lowerKey.includes(lowerFieldName) || lowerFieldName.includes(lowerKey)) {
        console.log(`Contains match found for "${fieldName}": "${key}" = "${employee[key]}"`)
        return employee[key]
      }
    }

    console.log(`No match found for field: "${fieldName}"`)
    return ""
  }

  // Get employee ID safely for debugging
  const employeeId = safeText(getField("employee id"))
  const dateFrom = safeText(getField("date from"))
  
  console.log(`Employee ID resolved to: "${employeeId}"`)
  console.log(`Date From resolved to: "${dateFrom}"`)

  // Payslip Title
  doc.setFontSize(20)
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFont("helvetica", "bold")
  doc.text("Payslip", 105, 52, { align: "center" })

  // Employee Information - Left Side
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text(employeeId || "N/A", 20, 65) // Use "N/A" if employee ID not found
  doc.setFont("helvetica", "normal")
  doc.text(
    `${safeText(getField("first name"))} ${safeText(getField("middle name"))} ${safeText(getField("last name"))}`.trim(),
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

export async function sendEmail({ to, subject, html, attachments, config }: EmailOptions) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: true,
    auth: {
      user: config.user,
      pass: config.password,
    },
  })

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    html,
    attachments,
  })
}
