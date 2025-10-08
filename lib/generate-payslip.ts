import { jsPDF } from "jspdf"
import fs from "fs"
import path from "path"

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
    const numValue = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(numValue as number)) return "0.00"
    return Number(numValue).toFixed(2)
  }

  const darkGray: [number, number, number] = [51, 51, 51]
  const lightGray: [number, number, number] = [128, 128, 128]
  const tealColor: [number, number, number] = [0, 151, 178]

  // --- Helper to get fields from employee object ---
  const getField = (fieldName: string): string | number => {
    const lowerFieldName = fieldName.toLowerCase().trim()
    for (const key in employee) {
      if (key.toLowerCase().trim() === lowerFieldName) return employee[key]
    }
    for (const key in employee) {
      if (key.toLowerCase().includes(lowerFieldName)) return employee[key]
    }
    return ""
  }

  // --- Header Section with properly sized logo ---
  try {
    const logoPath = path.join(process.cwd(), "public", "FSLOGO.png")
    const logoBuffer = fs.readFileSync(logoPath)
    const logoBase64 = logoBuffer.toString("base64")
    const logoDataUrl = `data:image/png;base64,${logoBase64}`
    
    // Use original dimensions: 750×172, scaled down appropriately
    // Calculate width to maintain aspect ratio while fitting nicely
    const originalWidth = 750
    const originalHeight = 172
    const aspectRatio = originalHeight / originalWidth
    
    // Set logo width to span most of the page width, height calculated from aspect ratio
    const logoWidth = 80 // Increased width to prevent wrapping/stretching
    const logoHeight = logoWidth * aspectRatio // Maintain aspect ratio
    
    // Center the logo horizontally
    const pageWidth = 210 // A4 width in mm
    const logoX = (pageWidth - logoWidth) / 2
    
    doc.addImage(logoDataUrl, "PNG", logoX, 10, logoWidth, logoHeight)
  } catch (error) {
    console.error("Error adding logo:", error)
  }

  // Company Info (centered under logo) - adjusted position based on logo height
  const logoBottom = 10 + (80 * (172 / 750)) // Calculate where logo ends
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("FullSuite", 105, logoBottom + 10, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("5th Floor, 19 Ben Palispis Highway, Legarda-", 105, logoBottom + 15, { align: "center" })
  doc.text("Burnham-Kisad, Baguio City, North Luzon, Benguet, 2600", 105, logoBottom + 19, { align: "center" })

  // Payslip Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text("Payslip", 105, logoBottom + 30, { align: "center" })

  // --- Employee Info ---
  const infoStartY = logoBottom + 45
  doc.setFontSize(9)
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])

  doc.setFont("helvetica", "bold")
  doc.text("Employee ID:", 20, infoStartY)
  doc.setFont("helvetica", "normal")
  doc.text(safeText(getField("employee id")), 50, infoStartY)

  doc.setFont("helvetica", "bold")
  doc.text("Name:", 20, infoStartY + 5)
  doc.setFont("helvetica", "normal")
  doc.text(
    `${safeText(getField("first name"))} ${safeText(getField("middle name"))} ${safeText(getField("last name"))}`.trim(),
    50,
    infoStartY + 5
  )

  doc.setFont("helvetica", "bold")
  doc.text("Position:", 20, infoStartY + 10)
  doc.setFont("helvetica", "normal")
  doc.text(safeText(getField("job title")), 50, infoStartY + 10)

  // Pay Period Info (Right Side) - Removed Hire Date
  doc.setFont("helvetica", "bold")
  doc.text("Pay Period:", 130, infoStartY)
  doc.setFont("helvetica", "normal")
  doc.text(`${safeText(getField("date from"))} to ${safeText(getField("date to"))}`, 165, infoStartY)

  doc.setFont("helvetica", "bold")
  doc.text("Pay Day:", 130, infoStartY + 5)
  doc.setFont("helvetica", "normal")
  doc.text(safeText(getField("date payment")), 165, infoStartY + 5)

  // --- Earnings Section ---
  let yPos = infoStartY + 25
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Earnings", 20, yPos)
  doc.text("Amount", 170, yPos)

  doc.setDrawColor(200, 200, 200)
  doc.line(20, yPos + 2, 190, yPos + 2)

  yPos += 8
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")

  const earnings = [
    { label: "Basic Pay", field: "basic pay" },
    { label: "Regular OT", field: "regular ot" },
    { label: "Special Holiday Premium Pay", field: "special holiday premium pay" },
    { label: "Regular Holiday Premium Pay", field: "regular holiday premium pay" },
    { label: "Night Differential", field: "night differential" },
    { label: "Transportation Allowance", field: "transportation allowance" },
    { label: "Other Pay (Taxable)", field: "other pay (taxable)" },
    { label: "Spot Bonus", field: "spot bonus" },
    { label: "Rest Day OT", field: "rest day ot" }
  ]

  earnings.forEach(item => {
    const value = getField(item.field)
    const numValue = typeof value === "string" ? parseFloat(value) : value
    if (numValue !== 0 && !isNaN(numValue as number)) {
      doc.text(item.label, 20, yPos)
      doc.text(formatNumber(value), 190, yPos, { align: "right" })
      yPos += 5
    }
  })

  yPos += 3
  doc.setFont("helvetica", "bold")
  doc.line(20, yPos - 2, 190, yPos - 2)
  doc.text("Total Earnings:", 20, yPos)
  doc.text(formatNumber(getField("total earnings")), 190, yPos, { align: "right" })

  // --- Deductions Section ---
  yPos += 12
  doc.setFontSize(10)
  doc.text("Deductions", 20, yPos)
  doc.text("Amount", 170, yPos)
  doc.line(20, yPos + 2, 190, yPos + 2)

  yPos += 8
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")

  const deductions = [
    { label: "Absences", field: "absences" },
    { label: "Undertime/Tardiness", field: "undertime/tardiness" },
    { label: "SSS (EE)", field: "sss (ee)" },
    { label: "HDMF (EE)", field: "hdmf (ee)" },
    { label: "PHIC (EE)", field: "phic (ee)" },
    { label: "SSS Loan", field: "sss loan" },
    { label: "HDMF Loan", field: "hdmf loan" },
    { label: "Salary Loan Repayment", field: "salary loan repayment" }
  ]

  deductions.forEach(item => {
    const value = getField(item.field)
    const numValue = typeof value === "string" ? parseFloat(value) : value
    if (numValue !== 0 && !isNaN(numValue as number)) {
      doc.text(item.label, 20, yPos)
      doc.text(formatNumber(value), 190, yPos, { align: "right" })
      yPos += 5
    }
  })

  yPos += 3
  doc.setFont("helvetica", "bold")
  doc.line(20, yPos - 2, 190, yPos - 2)
  doc.text("Total Deductions:", 20, yPos)
  doc.text(formatNumber(getField("total deductions")), 190, yPos, { align: "right" })

  // --- Net Pay Section ---
  yPos += 15
  doc.setFontSize(14)
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.text("Take Home Pay:", 105, yPos, { align: "center" })

  yPos += 8
  doc.setFontSize(20)
  doc.setTextColor(tealColor[0], tealColor[1], tealColor[2])
  doc.text(formatNumber(getField("net pay")), 105, yPos, { align: "center" })

  // --- Notes ---
  yPos += 15
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
  doc.text("Notes:", 20, yPos)

  yPos += 8
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2])
  doc.text("This is a system generated payslip.", 105, yPos, { align: "center" })

  // Convert to Buffer
  const pdfOutput = doc.output("arraybuffer")
  const buffer = Buffer.from(pdfOutput)

  try {
    (doc as any).destroy?.()
  } catch {}

  return buffer
}