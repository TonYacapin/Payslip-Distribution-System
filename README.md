# 📤 Payslip Distribution System

A modern **Next.js client component** for securely distributing employee payslips via email.  
This tool allows HR or payroll staff to **upload a CSV file** of employee data and automatically **generate and send personalized payslips** through a configured SMTP email server.

---

## 🚀 Features

- 📁 Upload and validate CSV payroll data  
- 📧 Send personalized payslips via SMTP (e.g., Gmail, Outlook, custom mail servers)  
- 🔒 Secure input for email credentials (uses app passwords or SMTP tokens)  
- 📊 Real-time progress tracking with status updates (total sent, failed, current email)  
- ✅ Inline success/error alerts for transparency  
- 🎨 Clean, responsive UI built with **ShadCN + TailwindCSS**

---

## 🧩 Tech Stack

- **Next.js (App Router)**
- **React 18** (Client Component)
- **TypeScript**
- **ShadCN/UI Components**
- **Lucide Icons**
- **Tailwind CSS**

---

## 📂 File Overview

```
/components/PayslipSystem.tsx   # Main client component
/api/send-payslips              # Backend API endpoint (server action or route)
```

---

## ⚙️ Environment Setup

Before using this tool, ensure you have:

1. **SMTP Access**  
   - For Gmail, use an **App Password** (not your regular password).  
   - Example:
     - Host: `smtp.gmail.com`
     - Port: `465`
     - User: `your-email@gmail.com`
     - Password: `your-app-password`
     - From: `payroll@company.com`

2. **CSV File Format**  
   The uploaded CSV should contain payroll-related data such as:
   ```
   EmployeeID,FirstName,LastName,Email,Position,StartDate,EndDate,NetPay
   OCCI-0458,Angel,Hamelton,hamelton.yacapin@getfullsuite.com,Software Engineer,9/1/25,9/15/25,8000
   ```
   Each record corresponds to a payslip that will be emailed to the specified employee.

3. **API Route (`/api/send-payslips`)**  
   The frontend expects a backend route that:
   - Accepts a `multipart/form-data` payload with `file` and `emailConfig`
   - Streams status updates in the form of:
     ```json
     data: {
       "status": { "total": 10, "sent": 3, "failed": 0, "current": "user@example.com" },
       "complete": false
     }
     ```
   - Emits `"complete": true` once finished.

---

## 💻 Usage

### 1. Add the Component

```tsx
import PayslipSystem from "@/components/PayslipSystem"

export default function Page() {
  return <PayslipSystem />
}
```

### 2. Configure the API Endpoint

Implement `/api/send-payslips` (Node.js, Next.js API route, or serverless function) to handle:
- CSV parsing
- Payslip generation (PDF or similar)
- SMTP email sending
- Streaming progress updates via `ReadableStream`

### 3. Run the App

```bash
npm install
npm run dev
```

Then open:
```
http://localhost:3000
```

---

## 📦 Example Workflow

1. Upload your payroll CSV file  
2. Enter SMTP configuration (Gmail, Outlook, etc.)  
3. Click **“Send Payslips”**  
4. Watch progress updates in real-time  
5. Receive confirmation once all payslips are successfully sent 🎉

---

## 🧠 Tips & Best Practices

- Use **App Passwords** for Gmail instead of your personal password.
- Always test with a small batch before large distributions.
- If you hit SMTP limits, consider using transactional mail services like:
  - **SendGrid**
  - **Mailgun**
  - **Amazon SES**

---

## 🐛 Error Handling

| Issue | Possible Cause | Solution |
|-------|----------------|-----------|
| `Please select a valid CSV file` | Wrong file type | Ensure `.csv` extension |
| `Please fill in all email configuration fields` | Missing SMTP fields | Complete all inputs |
| `Failed to process payslips` | Backend issue | Check server logs or endpoint URL |
| `Connection timed out` | Wrong port or SSL misconfiguration | Use port `465` with SSL or `587` with TLS |

---

## 📜 License

Proprietary Notice and Usage Rights
This system is proprietary software developed for internal corporate use only. It is not licensed under an open-source agreement, and all source code and intellectual property rights are reserved.

The tool is intended for modification and integration solely within authorized internal HR or Payroll systems under strict confidentiality and corporate governance policies.
---

## 👨‍💻 Author

Developed by **Ton Yacapin**  
For inquiries or collaborations, reach out via [LinkedIn](https://www.linkedin.com/in/angel-hamelton-yacapin-2b8271304/) or [GitHub](https://github.com/TonYacapin).
