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

    let data = [];
    const fileName = file.name.toLowerCase();

    // Check if it's a CSV file
    if (fileName.endsWith('.csv')) {
      // Parse CSV file
      const text = buffer.toString('utf-8');
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return NextResponse.json(
          { message: 'CSV file is empty or has no data rows' },
          { status: 400 }
        );
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        // Parse CSV line handling quoted values
        for (let char of lines[i]) {
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim()); // Push last value
        
        // Create row object
        const rowData = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            rowData[header] = values[index];
          }
        });
        
        if (Object.keys(rowData).length > 0) {
          data.push(rowData);
        }
      }
    } else {
      // Parse Excel file using ExcelJS
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        return NextResponse.json(
          { message: 'No worksheet found in Excel file' },
          { status: 400 }
        );
      }

      const headers = [];
      
      // Get headers
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value;
      });

      // Process data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowData[header] = cell.value;
          }
        });
        
        if (Object.keys(rowData).length > 0) {
          data.push(rowData);
        }
      });
    }

    if (data.length === 0) {
      return NextResponse.json(
        { message: 'File is empty or has no valid data' },
        { status: 400 }
      );
    }

    // Process questions
    const questions = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Expected columns: Question, Option1, Option2, Option3, Option4, CorrectAnswer, Marks
      const question = row.Question || row.question;
      const option1 = row.Option1 || row.option1;
      const option2 = row.Option2 || row.option2;
      const option3 = row.Option3 || row.option3;
      const option4 = row.Option4 || row.option4;
      const correctAnswer = row.CorrectAnswer || row.correctAnswer || row['Correct Answer'];
      const marks = row.Marks || row.marks || 1;

      if (!question || !option1 || !option2 || !option3 || !option4) {
        return NextResponse.json(
          { message: `Row ${i + 2}: Missing required fields (question, option1, option2, option3, option4)` },
          { status: 400 }
        );
      }

      if (!correctAnswer || correctAnswer < 1 || correctAnswer > 4) {
        return NextResponse.json(
          { message: `Row ${i + 2}: Correct answer must be between 1 and 4` },
          { status: 400 }
        );
      }

      questions.push({
        question: question.toString(),
        options: [
          option1.toString(),
          option2.toString(),
          option3.toString(),
          option4.toString()
        ],
        correctAnswer: parseInt(correctAnswer) - 1, // Convert to 0-based index
        marks: parseInt(marks) || 1
      });
    }

    return NextResponse.json({
      message: 'Questions uploaded successfully',
      questions
    });

  } catch (error) {
    console.error('Error uploading questions:', error);
    return NextResponse.json(
      { message: 'Error processing file: ' + error.message },
      { status: 500 }
    );
  }
}
