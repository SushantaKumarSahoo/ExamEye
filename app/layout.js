import './globals.css'

export const metadata = {
  title: 'ExamEye - Online Exam Portal',
  description: 'Comprehensive exam portal for students and administrators',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}