import './globals.css'

// Force all pages to be dynamically rendered
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0

export const metadata = {
  title: 'ExamEye - Secure Online Examination Platform',
  description: 'Advanced AI-powered proctoring and secure exam delivery system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
