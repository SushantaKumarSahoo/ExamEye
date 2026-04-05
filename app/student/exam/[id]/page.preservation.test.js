/**
 * Preservation Property Tests for Exam Functionality
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * These tests verify that non-Start-Exam interactions continue to work correctly.
 * They capture the baseline behavior that must be preserved after the fix is applied.
 * 
 * IMPORTANT: These tests follow observation-first methodology:
 * 1. Run tests on UNFIXED code
 * 2. Tests should PASS (confirming baseline behavior)
 * 3. After fix is applied, re-run to ensure no regressions
 * 
 * Property 2: Preservation - Non-Start-Button Interactions Remain Unchanged
 * 
 * For any user interaction that is NOT clicking the "Start Exam" button:
 * - Question navigation (Previous/Next buttons)
 * - Answer selection
 * - Exam submission
 * - Timer countdown and auto-submission
 * - Instruction page skipping (when disabled)
 * 
 * The system SHOULD continue to function exactly as before.
 */

import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import StudentExam from './page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock js-cookie
jest.mock('js-cookie', () => ({
  get: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window.confirm
global.confirm = jest.fn();

describe('Preservation Property Tests: Non-Start-Exam Interactions', () => {
  let mockRouter;
  let mockPush;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPush = jest.fn();
    mockRouter = {
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
    
    useRouter.mockReturnValue(mockRouter);
    useParams.mockReturnValue({ id: 'test-exam-123' });
    Cookies.get.mockReturnValue('valid-token');
    global.confirm.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  /**
   * Requirement 3.1: Instruction Page Skipping
   * 
   * WHEN the exam has instructions disabled 
   * THEN the system SHALL CONTINUE TO skip the instruction page and show exam questions directly
   */
  test('Property 2.1: Instruction page skipping works when instructions are disabled', async () => {
    // Setup: Create exam with instructions DISABLED
    const mockExamData = {
      exam: {
        _id: 'test-exam-123',
        title: 'Test Exam Without Instructions',
        duration: 60,
        instructions: {
          enabled: false, // Instructions disabled
        },
        questions: [
          {
            question: 'Test Question 1',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 0,
            marks: 1,
          },
        ],
      },
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockExamData,
    });

    // Render component
    render(<StudentExam />);

    // Wait for exam to load
    await waitFor(() => {
      expect(screen.queryByText('Loading Exam...')).not.toBeInTheDocument();
    });

    // ASSERT: Should skip instructions and show questions directly
    expect(screen.queryByText('Start Exam')).not.toBeInTheDocument();
    expect(screen.getByText('Test Question 1')).toBeInTheDocument();
    expect(screen.getByText('Test Exam Without Instructions')).toBeInTheDocument();
  });

  /**
   * Requirement 3.2: Acknowledgment Validation
   * 
   * WHEN acknowledgment is required but not checked 
   * THEN the system SHALL CONTINUE TO show an alert and prevent exam start
   * 
   * NOTE: The button is disabled when acknowledgment is not checked, so we test
   * that the button is disabled and cannot be clicked.
   */
  test('Property 2.2: Acknowledgment validation prevents exam start when unchecked', async () => {
    const mockExamData = {
      exam: {
        _id: 'test-exam-123',
        title: 'Test Exam',
        duration: 60,
        instructions: {
          enabled: true,
          requireAcknowledgment: true,
          title: 'Instructions',
          content: '<p>Read carefully</p>',
          acknowledgmentText: 'I acknowledge',
        },
        questions: [
          {
            question: 'Question 1',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 0,
            marks: 1,
          },
        ],
      },
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockExamData,
    });

    render(<StudentExam />);

    await waitFor(() => {
      expect(screen.getByText('Instructions')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start Exam');
    const checkbox = screen.getByRole('checkbox');

    // Verify checkbox is unchecked
    expect(checkbox).not.toBeChecked();

    // ASSERT: Start button should be disabled when acknowledgment is not checked
    expect(startButton).toBeDisabled();

    // Check the acknowledgment checkbox
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });

    // ASSERT: Start button should now be enabled
    expect(startButton).not.toBeDisabled();

    // ASSERT: Should still be on instructions page (haven't clicked Start yet)
    expect(screen.getByText('Instructions')).toBeInTheDocument();
    expect(screen.queryByText('Question 1')).not.toBeInTheDocument();
  });

  /**
   * Requirement 3.3: Question Navigation
   * 
   * WHEN the student navigates between exam questions using Previous/Next buttons 
   * THEN the system SHALL CONTINUE TO function correctly
   */
  test('Property 2.3: Previous/Next button navigation works correctly', async () => {
    // Setup: Create exam with multiple questions
    const mockExamData = {
      exam: {
        _id: 'test-exam-123',
        title: 'Navigation Test',
        duration: 60,
        instructions: { enabled: false },
        questions: [
          {
            question: 'Test Question 1',
            options: ['1A', '1B', '1C', '1D'],
            correctAnswer: 0,
            marks: 1,
          },
          {
            question: 'Test Question 2',
            options: ['2A', '2B', '2C', '2D'],
            correctAnswer: 0,
            marks: 1,
          },
          {
            question: 'Test Question 3',
            options: ['3A', '3B', '3C', '3D'],
            correctAnswer: 0,
            marks: 1,
          },
        ],
      },
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockExamData,
    });

    render(<StudentExam />);

    await waitFor(() => {
      expect(screen.getByText('Test Question 1')).toBeInTheDocument();
    });

    // ASSERT: Start at question 1
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'Question 1 of 3';
    })).toBeInTheDocument();

    // Navigate to question 2
    fireEvent.click(screen.getByText('Next →'));
    await waitFor(() => {
      expect(screen.getByText('Test Question 2')).toBeInTheDocument();
    });

    // Navigate to question 3
    fireEvent.click(screen.getByText('Next →'));
    await waitFor(() => {
      expect(screen.getByText('Test Question 3')).toBeInTheDocument();
    });

    // ASSERT: At last question, should see Submit button
    expect(screen.getByText('Submit Exam')).toBeInTheDocument();
    expect(screen.queryByText('Next →')).not.toBeInTheDocument();

    // Navigate back to question 2
    fireEvent.click(screen.getByText('← Previous'));
    await waitFor(() => {
      expect(screen.getByText('Test Question 2')).toBeInTheDocument();
    });

    // Navigate back to question 1
    fireEvent.click(screen.getByText('← Previous'));
    await waitFor(() => {
      expect(screen.getByText('Test Question 1')).toBeInTheDocument();
    });

    // ASSERT: Back at first question, Previous button should be disabled
    expect(screen.getByText('← Previous')).toBeDisabled();
  });

  /**
   * Requirement 3.3: Answer Selection
   * 
   * WHEN the student selects answers 
   * THEN the system SHALL CONTINUE TO update state correctly
   */
  test('Property 2.4: Answer selection updates state correctly', async () => {
    const mockExamData = {
      exam: {
        _id: 'test-exam-123',
        title: 'Answer Selection Test',
        duration: 60,
        instructions: { enabled: false },
        questions: [
          {
            question: 'Question 1',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 0,
            marks: 1,
          },
          {
            question: 'Question 2',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 0,
            marks: 1,
          },
        ],
      },
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockExamData,
    });

    render(<StudentExam />);

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    // Select answer B for question 1
    const optionB = screen.getByText('Option B');
    fireEvent.click(optionB);

    // Navigate to question 2
    fireEvent.click(screen.getByText('Next →'));
    await waitFor(() => {
      expect(screen.getByText('Question 2')).toBeInTheDocument();
    });

    // Select answer C for question 2
    const optionC = screen.getAllByText('Option C')[0];
    fireEvent.click(optionC);

    // Navigate back to question 1
    fireEvent.click(screen.getByText('← Previous'));
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    // ASSERT: Answer should be preserved (Option B should still be selected)
    // The selected option has red border and background
    const selectedOption = screen.getByText('Option B').closest('div');
    expect(selectedOption).toHaveStyle({ border: '2px solid rgb(220, 38, 38)' });
  });

  /**
   * Requirement 3.4: Exam Submission
   * 
   * WHEN the student submits the exam 
   * THEN the system SHALL CONTINUE TO navigate to the result page as expected
   */
  test('Property 2.5: Exam submission navigates to result page', async () => {
    const mockExamData = {
      exam: {
        _id: 'test-exam-123',
        title: 'Submission Test',
        duration: 60,
        instructions: { enabled: false },
        questions: [
          {
            question: 'Test Question 1',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 0,
            marks: 1,
          },
          {
            question: 'Test Question 2',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 0,
            marks: 1,
          },
        ],
      },
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockExamData,
    });

    // Mock submission API
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<StudentExam />);

    await waitFor(() => {
      expect(screen.getByText('Test Question 1')).toBeInTheDocument();
    });

    // Navigate to last question
    fireEvent.click(screen.getByText('Next →'));
    await waitFor(() => {
      expect(screen.getByText('Test Question 2')).toBeInTheDocument();
    });

    // Submit exam
    fireEvent.click(screen.getByText('Submit Exam'));

    // Wait for navigation (uses params.id which is 'test-exam-123')
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/student/result/test-exam-123');
    });
  });

  /**
   * Requirement 3.5: Timer Auto-Submission
   * 
   * WHEN the timer expires 
   * THEN the system SHALL CONTINUE TO auto-submit the exam correctly
   */
  test('Property 2.6: Timer countdown and auto-submission work correctly', async () => {
    jest.useFakeTimers();
    
    // Setup: Create exam with short duration
    const mockExamData = {
      exam: {
        _id: 'test-exam-123',
        title: 'Timer Test',
        duration: 1, // 1 minute = 60 seconds
        instructions: { enabled: false },
        questions: [
          {
            question: 'Test Question 1',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 0,
            marks: 1,
          },
        ],
      },
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockExamData,
    });

    // Mock submission API
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<StudentExam />);

    await waitFor(() => {
      expect(screen.getByText('Test Question 1')).toBeInTheDocument();
    });

    // Verify timer is displayed
    await waitFor(() => {
      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    // Fast-forward time by 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Verify timer updated
    await waitFor(() => {
      expect(screen.getByText('0:30')).toBeInTheDocument();
    });

    // Fast-forward to timer expiration (31 more seconds to exceed 60)
    act(() => {
      jest.advanceTimersByTime(31000);
    });

    // ASSERT: Exam should auto-submit and navigate to results (uses params.id)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/student/result/test-exam-123');
    }, { timeout: 2000 });
    
    jest.useRealTimers();
  });

  /**
   * Concrete Test: Full Exam Flow Without Start Button
   * 
   * This test verifies the complete exam flow when instructions are disabled,
   * ensuring all interactions work correctly without involving the Start Exam button.
   */
  test('Concrete Case: Complete exam flow with instructions disabled', async () => {
    const mockExamData = {
      exam: {
        _id: 'test-exam-123',
        title: 'Complete Flow Test',
        duration: 60,
        instructions: { enabled: false },
        questions: [
          {
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: 1,
            marks: 1,
          },
          {
            question: 'What is 3 + 3?',
            options: ['5', '6', '7', '8'],
            correctAnswer: 1,
            marks: 1,
          },
        ],
      },
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockExamData,
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<StudentExam />);

    // Wait for exam to load
    await waitFor(() => {
      expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    });

    // ASSERT: Instructions skipped, directly on questions
    expect(screen.queryByText('Start Exam')).not.toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'Question 1 of 2';
    })).toBeInTheDocument();

    // Select answer for question 1
    const option4 = screen.getByText('4');
    fireEvent.click(option4);

    // Navigate to question 2
    const nextButton = screen.getByText('Next →');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('What is 3 + 3?')).toBeInTheDocument();
    });

    // Select answer for question 2
    const option6 = screen.getByText('6');
    fireEvent.click(option6);

    // Submit exam
    const submitButton = screen.getByText('Submit Exam');
    fireEvent.click(submitButton);

    // ASSERT: Should navigate to results (uses params.id)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/student/result/test-exam-123');
    });
  });
});
