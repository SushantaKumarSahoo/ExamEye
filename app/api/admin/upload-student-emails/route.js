import { NextResponse } from 'next/server';
import { getUserFromToken } from '../../../../lib/auth';
import ExcelJS from 'exceljs';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { message: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name.toLowerCase();

    const emails = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    try {
      // Check if it's a CSV file
      if (fileName.endsWith('.csv')) {
        // Parse CSV file
        const text = buffer.toString('utf-8');
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header row if it exists (check if first row contains "email")
        const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Handle quoted values
          const email = line.replace(/^"|"$/g, '').trim().toLowerCase();
          
          if (emailRegex.test(email)) {
            if (!emails.includes(email)) {
              emails.push(email);
            }
          }
        }
      } else {
        // Parse Excel file using ExcelJS
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);
        
        if (!worksheet) {
          return NextResponse.json(
            { message: 'No worksheet found in the Excel file' },
            { status: 400 }
          );
        }
        
        // Extract emails from first column, skip header row if exists
        let skipFirstRow = false;
        const firstCell = worksheet.getRow(1).getCell(1).value;
        if (firstCell && String(firstCell).toLowerCase().includes('email')) {
          skipFirstRow = true;
        }
        
        worksheet.eachRow((row, rowNumber) => {
          if (skipFirstRow && rowNumber === 1) return;
          
          const cellValue = row.getCell(1).value;
          if (cellValue) {
            const email = String(cellValue).trim().toLowerCase();
            if (emailRegex.test(email)) {
              if (!emails.includes(email)) {
                emails.push(email);
              }
            }
          }
        });
      }

      if (emails.length === 0) {
        return NextResponse.json(
          { message: 'No valid email addresses found in the file' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: `Successfully extracted ${emails.length} email addresses`,
        emails
      });

    } catch (parseError) {
      console.error('File parsing error:', parseError);
      return NextResponse.json(
        { message: 'Error parsing file. Please ensure it\'s a valid Excel/CSV file with email addresses in the first column.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Upload student emails error:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
