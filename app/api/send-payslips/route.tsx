
import type { NextRequest } from "next/server"
import { generatePayslipPDF } from "@/lib/generate-payslip"
import { sendEmail } from "@/lib/send-email"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formData = await request.formData()
        const file = formData.get("file") as File
        const emailConfigStr = formData.get("emailConfig") as string

        if (!file || !emailConfigStr) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Missing file or email config" })}\n\n`))
          controller.close()
          return
        }

        const emailConfig = JSON.parse(emailConfigStr)
        const csvText = await file.text()
        const lines = csvText.split("\n").filter((line) => line.trim())

        if (lines.length < 2) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "CSV file is empty or invalid" })}\n\n`))
          controller.close()
          return
        }

        // Parse CSV headers
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))

        // Parse employee data
        const employees = []
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
          const employee: any = {}

          headers.forEach((header, index) => {
            const value = values[index]
            // Convert numeric fields
            if (
              header.includes("Pay") ||
              header.includes("OT") ||
              header.includes("Bonus") ||
              header.includes("Allowance") ||
              header.includes("SSS") ||
              header.includes("HDMF") ||
              header.includes("PHIC") ||
              header.includes("Absences") ||
              header.includes("Undertime") ||
              header.includes("Deduction") ||
              header.includes("Earnings") ||
              header.includes("Tax") ||
              header.includes("Differential") ||
              header.includes("Premium") ||
              header.includes("Loan") ||
              header.includes("Refund") ||
              header.includes("Grant") ||
              header.includes("Reimbursement") ||
              header.includes("Adjustment") ||
              header.includes("Advances") ||
              header.includes("ECC") ||
              header.includes("Provident")
            ) {
              employee[header] = value ? Number.parseFloat(value) || 0 : 0
            } else {
              employee[header] = value || ""
            }
          })

          employees.push(employee)
        }

        console.log("CSV Headers found:", headers)
        console.log("Parsed employees:", employees.length)
        console.log("First employee fields:", Object.keys(employees[0]))
        console.log("First employee data:", employees[0])

        let sent = 0
        let failed = 0

        // Process each employee
        for (const employee of employees) {
          const email = employee.Email || employee.email

          console.log("Processing employee:", employee["Employee ID"], "Email:", email)

          try {
            // Send status update
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  status: {
                    total: employees.length,
                    sent,
                    failed,
                    current: email || "Unknown",
                  },
                })}\n\n`,
              ),
            )

            if (!email) {
              console.log("No email found for employee:", employee["Employee ID"])
              failed++
              continue
            }

            // Generate PDF
            const pdfBuffer = await generatePayslipPDF(employee)

            // Get safe values for email with better fallbacks
            const firstName = employee["First Name"] || employee["first name"] || employee["First Name"] || ""
            const lastName = employee["Last Name"] || employee["last name"] || employee["Last Name"] || ""
            const dateFrom = employee["Date From"] || employee["date from"] || employee["Date From"] || ""
            const dateTo = employee["Date To"] || employee["date to"] || employee["Date To"] || ""

            // Create a safe filename - use multiple fallbacks for employee ID
            const employeeId = employee["Employee ID"] || employee["employee id"] || employee["Employee ID"] || 
                              employee["Emp ID"] || employee["emp id"] || `EMP-${sent + 1}`
            
            const safeDateFrom = dateFrom.replace(/\//g, "-") // Replace slashes with dashes for filename safety
            const safeFilename = `Payslip_${employeeId}_${safeDateFrom}.pdf`

            console.log(`Generated filename: ${safeFilename}`)

            // Send email
            await sendEmail({
              to: email,
              subject: `Payslip for ${dateFrom} - ${dateTo}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #0d9488;">Your Payslip is Ready</h2>
                  <p>Dear ${firstName} ${lastName},</p>
                  <p>Please find attached your payslip for the period ${dateFrom} to ${dateTo}.</p>
                  <p>If you have any questions, please contact HR.</p>
                  <p style="margin-top: 30px; color: #666;">Best regards,<br/>FullSuite Payroll Team</p>
                </div>
              `,
              attachments: [
                {
                  filename: safeFilename,
                  content: pdfBuffer,
                },
              ],
              config: emailConfig,
            })

            sent++
            console.log("Successfully sent to:", email)
          } catch (error) {
            console.error("Failed to send to", email, ":", error)
            failed++
          }
        }

        // Send completion message
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              complete: true,
              status: {
                total: employees.length,
                sent,
                failed,
                current: "Complete",
              },
            })}\n\n`,
          ),
        )

        controller.close()
      } catch (error) {
        console.error("Error processing payslips:", error)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: error instanceof Error ? error.message : "Failed to process payslips",
            })}\n\n`,
          ),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}