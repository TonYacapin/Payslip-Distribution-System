import type { NextRequest } from "next/server"
import { generatePayslipPDF } from "@/lib/generate-payslip"
import { sendEmail } from "@/lib/send-email"

export const runtime = "nodejs"

// Configuration
const BATCH_SIZE = 5 // Process 5 employees at a time
const DELAY_BETWEEN_BATCHES = 2000 // 2 seconds between batches
const DELAY_BETWEEN_EMAILS = 500 // 0.5 seconds between individual emails
const PROCESS_TIMEOUT = 30000 // 30 seconds timeout per employee

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

        console.log(`Processing ${employees.length} employees in batches of ${BATCH_SIZE}`)

        let sent = 0
        let failed = 0
        let currentBatch = 1
        const totalBatches = Math.ceil(employees.length / BATCH_SIZE)

        // Send initial progress
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              status: {
                total: employees.length,
                sent,
                failed,
                current: "Starting batch processing...",
                batchProgress: {
                  currentBatch: 0,
                  totalBatches,
                  batchSize: BATCH_SIZE
                }
              },
            })}\n\n`,
          ),
        )

        // Process employees in batches
        for (let i = 0; i < employees.length; i += BATCH_SIZE) {
          const batch = employees.slice(i, i + BATCH_SIZE)
          console.log(`Processing batch ${currentBatch}/${totalBatches} with ${batch.length} employees`)

          // Send batch start update
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: {
                  total: employees.length,
                  sent,
                  failed,
                  current: `Processing batch ${currentBatch}/${totalBatches}`,
                  batchProgress: {
                    currentBatch,
                    totalBatches,
                    batchSize: batch.length
                  }
                },
              })}\n\n`,
            ),
          )

          // Process batch with individual timeouts
          const batchPromises = batch.map(async (employee, index) => {
            try {
              // Add small delay between emails within batch to prevent rate limiting
              if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS))
              }

              return await processEmployeeWithTimeout(employee, emailConfig, PROCESS_TIMEOUT)
            } catch (error) {
              throw { employee, error }
            }
          })

          const batchResults = await Promise.allSettled(batchPromises)

          // Process batch results
          for (const result of batchResults) {
            if (result.status === 'fulfilled') {
              const value = result.value as { success: boolean; email: string; error?: string }
              if (value.success) {
                sent++
                console.log("Successfully sent to:", value.email)
              } else {
                failed++
                console.log("Failed to send to:", value.email, "Reason:", value.error)
              }
            } else {
              failed++
              const employeeEmail = result.reason.employee?.Email || result.reason.employee?.email || "Unknown"
              console.error("Failed to process employee:", employeeEmail, "Error:", result.reason.error)
            }
          }

          // Send batch completion update
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: {
                  total: employees.length,
                  sent,
                  failed,
                  current: `Completed batch ${currentBatch}/${totalBatches}`,
                  batchProgress: {
                    currentBatch,
                    totalBatches,
                    batchSize: batch.length
                  }
                },
              })}\n\n`,
            ),
          )

          currentBatch++

          // Delay between batches (except after the last batch)
          if (i + BATCH_SIZE < employees.length) {
            console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
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
              summary: {
                successRate: ((sent / employees.length) * 100).toFixed(1) + '%',
                processingTime: `Processed in ${totalBatches} batches`
              }
            })}\n\n`,
          ),
        )

        console.log(`Processing complete: ${sent} sent, ${failed} failed`)
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

// Helper function to process individual employee with timeout
async function processEmployeeWithTimeout(employee: any, emailConfig: any, timeout: number) {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Processing timeout after ${timeout}ms`)), timeout)
  )

  const processPromise = processEmployee(employee, emailConfig)

  try {
    const result = await Promise.race([processPromise, timeoutPromise])
    return result
  } catch (error) {
    throw error
  }
}

// Helper function to process individual employee
async function processEmployee(employee: any, emailConfig: any) {
  const email = employee.Email || employee.email

  if (!email) {
    console.log("No email found for employee:", employee["Employee ID"])
    return { success: false, email: "No email", error: "No email address" }
  }

  try {
    // Generate PDF
    const pdfBuffer = await generatePayslipPDF(employee)

    // Get safe values for email with better fallbacks
    const firstName = employee["First Name"] || employee["first name"] || employee["First Name"] || ""
    const lastName = employee["Last Name"] || employee["last name"] || employee["Last Name"] || ""
    const dateFrom = employee["Date From"] || employee["date from"] || employee["Date From"] || ""
    const dateTo = employee["Date To"] || employee["date to"] || employee["Date To"] || ""

    // Create a safe filename
    const employeeId = employee["Employee ID"] || employee["employee id"] || employee["Employee ID"] || 
                      employee["Emp ID"] || employee["emp id"] || `EMP-${Math.random().toString(36).substr(2, 9)}`
    
    const safeDateFrom = dateFrom.replace(/\//g, "-")
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

    return { success: true, email }
  } catch (error) {
    console.error("Failed to send to", email, ":", error)
    return { 
      success: false, 
      email, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}