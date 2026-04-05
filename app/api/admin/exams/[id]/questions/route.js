import { NextResponse } from 'next/server';
import connectDB from '../../../../../../lib/mongodb';
import Exam from '../../../../../../models/Exam';
import { getUserFromToken } from '../../../../../../lib/auth';

export async function POST(request, { params }) {
  try {
    await connectDB();

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

    const { id: examId } = await params;
    const questionData = await request.json();

    // Find the exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return NextResponse.json(
        { message: 'Exam not found' },
        { status: 404 }
      );
    }

    // Validate question data
    const { question, questionType, options, correctAnswer, marks } = questionData;

    if (!question || !questionType || !correctAnswer || !marks) {
      return NextResponse.json(
        { message: 'All question fields are required' },
        { status: 400 }
      );
    }

    // Validate question type specific requirements
    let processedOptions = [];
    let processedCorrectAnswer = correctAnswer;

    switch (questionType) {
      case 'true-false':
        processedOptions = ['True', 'False'];
        // Ensure correct answer is 0 or 1 for true/false
        if (![0, 1, 'True', 'False'].includes(correctAnswer)) {
          return NextResponse.json(
            { message: 'True/False questions must have correct answer as 0 (True) or 1 (False)' },
            { status: 400 }
          );
        }
        processedCorrectAnswer = correctAnswer === 'True' || correctAnswer === 0 ? 0 : 1;
        break;

      case 'multiple-choice':
        if (!options || options.length < 2) {
          return NextResponse.json(
            { message: 'Multiple choice questions must have at least 2 options' },
            { status: 400 }
          );
        }
        processedOptions = options.filter(opt => opt.trim() !== '');
        if (processedCorrectAnswer >= processedOptions.length) {
          return NextResponse.json(
            { message: 'Correct answer index is out of range' },
            { status: 400 }
          );
        }
        break;

      case 'multiple-answer':
        if (!options || options.length < 2) {
          return NextResponse.json(
            { message: 'Multiple answer questions must have at least 2 options' },
            { status: 400 }
          );
        }
        processedOptions = options.filter(opt => opt.trim() !== '');
        // For multiple answers, correctAnswer should be an array
        if (!Array.isArray(correctAnswer) || correctAnswer.length === 0) {
          return NextResponse.json(
            { message: 'Multiple answer questions must have at least one correct answer' },
            { status: 400 }
          );
        }
        // Validate all correct answer indices
        for (let idx of correctAnswer) {
          if (idx >= processedOptions.length) {
            return NextResponse.json(
              { message: 'One or more correct answer indices are out of range' },
              { status: 400 }
            );
          }
        }
        processedCorrectAnswer = correctAnswer;
        break;

      default:
        return NextResponse.json(
          { message: 'Invalid question type' },
          { status: 400 }
        );
    }

    // Create new question object
    const newQuestion = {
      question: question.trim(),
      questionType,
      options: processedOptions,
      correctAnswer: processedCorrectAnswer,
      marks: parseInt(marks),
      addedAt: new Date(),
      addedBy: user._id
    };

    // Add question to exam
    exam.questions.push(newQuestion);

    // Update total marks
    exam.totalMarks = exam.questions.reduce((sum, q) => sum + q.marks, 0);

    await exam.save();

    return NextResponse.json({
      message: 'Question added successfully',
      question: newQuestion,
      totalQuestions: exam.questions.length,
      totalMarks: exam.totalMarks
    });

  } catch (error) {
    console.error('Error adding question:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    await connectDB();

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

    const { id: examId } = await params;

    // Find the exam with questions
    const exam = await Exam.findById(examId).populate('questions.addedBy', 'username');
    if (!exam) {
      return NextResponse.json(
        { message: 'Exam not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      examId: exam._id,
      examTitle: exam.title,
      questions: exam.questions,
      totalQuestions: exam.questions.length,
      totalMarks: exam.totalMarks,
      examStatus: exam.status
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}