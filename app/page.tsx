"use client"

import type React from "react"

import { useState } from "react"
import { Upload, Mail, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

interface EmailConfig {
  host: string
  port: number
  user: string
  password: string
  from: string
}

interface ProcessingStatus {
  total: number
  sent: number
  failed: number
  current: string
}

export default function PayslipSystem() {
  const [file, setFile] = useState<File | null>(null)
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    host: "smtp.gmail.com",
    port: 465,
    user: "",
    password: "",
    from: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile)
      setError(null)
    } else {
      setError("Please select a valid CSV file")
      setFile(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setError("Please select a CSV file")
      return
    }

    if (!emailConfig.host || !emailConfig.user || !emailConfig.password || !emailConfig.from) {
      setError("Please fill in all email configuration fields")
      return
    }

    setIsProcessing(true)
    setError(null)
    setSuccess(false)
    setStatus(null)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("emailConfig", JSON.stringify(emailConfig))

    try {
      const response = await fetch("/api/send-payslips", {
        method: "POST",
        body: formData,
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n").filter((line) => line.trim())

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6))

              if (data.error) {
                setError(data.error)
                setIsProcessing(false)
                return
              }

              if (data.status) {
                setStatus(data.status)
              }

              if (data.complete) {
                setSuccess(true)
                setIsProcessing(false)
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process payslips")
      setIsProcessing(false)
    }
  }

  const progress = status ? (status.sent / status.total) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900">Payslip Distribution System</h1>
          <p className="text-slate-600 text-lg">Upload CSV and send personalized payslips to employees</p>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                Upload Payroll CSV
              </CardTitle>
              <CardDescription>Select the CSV file containing employee payroll data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-400 transition-colors">
                  <Input
                    id="file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <Label htmlFor="file" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {file ? file.name : "Click to upload CSV file"}
                    </span>
                    <span className="text-xs text-slate-500">CSV files only</span>
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Configuration Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-teal-600" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>Configure your email server settings (Port 465 - SSL/TLS)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="host">SMTP Host</Label>
                  <Input
                    id="host"
                    placeholder="smtp.gmail.com"
                    value={emailConfig.host}
                    onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                    disabled={isProcessing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={emailConfig.port}
                    onChange={(e) => setEmailConfig({ ...emailConfig, port: Number.parseInt(e.target.value) })}
                    disabled={isProcessing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user">Email Username</Label>
                <Input
                  id="user"
                  type="email"
                  placeholder="your-email@example.com"
                  value={emailConfig.user}
                  onChange={(e) => setEmailConfig({ ...emailConfig, user: e.target.value })}
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">App Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your app password"
                  value={emailConfig.password}
                  onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from">From Email Address</Label>
                <Input
                  id="from"
                  type="email"
                  placeholder="payroll@company.com"
                  value={emailConfig.from}
                  onChange={(e) => setEmailConfig({ ...emailConfig, from: e.target.value })}
                  disabled={isProcessing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Status Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>All payslips have been sent successfully!</AlertDescription>
            </Alert>
          )}

          {/* Progress Card */}
          {status && (
            <Card className="border-teal-200 bg-teal-50">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-700">Processing Payslips</span>
                    <span className="text-teal-700">
                      {status.sent} / {status.total}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                <div className="text-sm text-slate-600">
                  <p>
                    Currently sending to: <span className="font-medium">{status.current}</span>
                  </p>
                  {status.failed > 0 && <p className="text-red-600 mt-1">Failed: {status.failed}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            disabled={isProcessing || !file}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Payslips
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
