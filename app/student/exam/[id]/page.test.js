/**
 * Bug Condition Exploration Test for Exam Start Browser Back Navigation
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * This test explores the bug condition where clicking "Start Exam" causes browser back navigation.
 * 
 * CRITICAL: This test is EXPECTED TO FAIL on unfixed code - failure confirms the bug exists.
 * 
 * Property 1: Bug Condition - Start Exam Button Causes Browser Back Navigation
 * 
 * For any button click event on the "Start Exam" button where:
 * - showInstructions is true
 * - exam.instructions.enabled is true
 * - acknowledgment is valid (either not required OR checked)
 * 
 * The system SHOULD:
 * - Prevent default browser navigation behavior
 * - Transition smoothly to exam questions (showInstructions becomes false)
 * - NOT cause browser history changes
 * - Maintain focus on the exam interface
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import StudentExam from './page';
import fc from 'fast-check';

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

describe('Bug Condition Exploration: Start Exam Button Browser Navigation', () => {
  let mockRouter;
  let mockPush;
  let mockBack;
  let originalHistoryLength;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Track browser history
    originalHistoryLength = window.history.length;
    
    // Mock router with navigation tracking
    mockPush = jest.fn();
    mockBack = jest.fn();
    mockRouter = {
      push: mockPush,
      back: mockBack,
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
    
    useRouter.mockReturnValue(mockRouter);
    useParams.mockReturnValue({ id: 'test-exam-123' });
    Cookies.get.mockReturnValue('valid-token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Property-Based Test: Bug Condition Detection
   * 
   * This test uses property-based testing to explore the bug condition across
   * different exam configurations. For deterministic bugs like this one, we scope
   * the property to the concrete failing case to ensure reproducibility.
   * 
   * The test generates exam configurations where:
   * - Instructions are enabled
   * - Acknowledgment may or may not be required
   * - When required, acknowledgment is checked
   * 
   * EXPECTED OUTCOME: This test WILL FAIL on unfixed code because:
   * - The handleStartExam function does NOT call event.preventDefault()
   * - The button may have implicit type="submit" behavior
   * - Browser navigation occurs when it shouldn't
   * 
   * Counterexamples will demonstrate:
   * - Browser history changes when Start Exam is clicked
   * - Default event behavior is not prevented
   * - Navigation occurs instead of smooth transition
   */
  test('Property 1: Start Exam button should NOT cause browser navigation', async () => {
    // Scoped property-based test for the concrete failing case
    await fc.assert(
      fc.asyncProperty(
        // Generate exam configurations that trigger the bug condition
        fc.record({
          requireAcknowledgment: fc.boolean(),
          instructionsTitle: fc.constantFrom(
            'Exam Instructions',
            'Important Guidelines',
            'Read Before Starting',
            'Test Instructions',
            'Examination Rules'
          ),
          instructionsContent: fc.constantFrom(
            'Please read these instructions carefully before starting the exam.',
            'You must complete all questions within the time limit.',
            'No external resources are allowed during this examination.',
            'Answer all questions to the best of your ability.',
            'Make sure you understand all requirements before proceeding.'
          ),
          acknowledgmentText: fc.constantFrom(
            'I have read and understood the instructions',
            'I agree to follow all exam rules',
            'I acknowledge the exam requirements',
            'I understand the examination guidelines',
            'I confirm I have read the instructions'
          ),
        }),
        async (examConfig) => {
          // Setup: Create exam data with instructions enabled
          const mockExamData = {
            exam: {
              _id: 'test-exam-123',
              title: 'Test Exam',
              duration: 60,
              instructions: {
                enabled: true, // Bug condition: instructions are enabled
                requireAcknowledgment: examConfig.requireAcknowledgment,
                title: examConfig.instructionsTitle,
                content: `<p>${examConfig.instructionsContent}</p>`,
                acknowledgmentText: examConfig.acknowledgmentText,
              },
              questions: [
                {
                  question: 'Sample Question',
                  options: ['A', 'B', 'C', 'D'],
                  correctAnswer: 0,
                  marks: 1,
                },
              ],
            },
          };

          // Mock fetch to return exam data
          global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockExamData,
          });

          // Render the component
          const { container, unmount } = render(<StudentExam />);

          try {
            // Wait for exam to load
            await waitFor(() => {
              expect(screen.queryByText('Loading Exam...')).not.toBeInTheDocument();
            });

            // Verify we're on the instructions page
            expect(screen.getByText(examConfig.instructionsTitle)).toBeInTheDocument();
            expect(screen.getByText('Start Exam')).toBeInTheDocument();

            // If acknowledgment is required, check the checkbox
            if (examConfig.requireAcknowledgment) {
              const checkbox = screen.getByRole('checkbox');
              fireEvent.click(checkbox);
              await waitFor(() => {
                expect(checkbox).toBeChecked();
              });
            }

            // Track navigation events
            let defaultPrevented = false;
            let propagationStopped = false;

            // Create a custom event to track preventDefault and stopPropagation
            const startButton = screen.getByText('Start Exam');
            
            // Add event listener to detect if preventDefault is called
            const clickHandler = jest.fn((event) => {
              // Check if preventDefault was called
              const originalPreventDefault = event.preventDefault;
              event.preventDefault = jest.fn(() => {
                defaultPrevented = true;
                originalPreventDefault.call(event);
              });

              // Check if stopPropagation was called
              const originalStopPropagation = event.stopPropagation;
              event.stopPropagation = jest.fn(() => {
                propagationStopped = true;
                originalStopPropagation.call(event);
              });
            });

            startButton.addEventListener('click', clickHandler, { capture: true });

            // Track browser history before click
            const historyLengthBefore = window.history.length;

            // ACT: Click the "Start Exam" button
            fireEvent.click(startButton);

            // Wait for any state updates
            await waitFor(() => {
              // Give time for any navigation to occur
            }, { timeout: 100 });

            // Track browser history after click
            const historyLengthAfter = window.history.length;

            // ASSERT: Expected behavior (will FAIL on unfixed code)
            
            // 1. Default browser behavior should be prevented
            expect(defaultPrevented).toBe(true);

            // 2. Event propagation should be stopped
            expect(propagationStopped).toBe(true);

            // 3. Browser history should NOT change
            expect(historyLengthAfter).toBe(historyLengthBefore);

            // 4. Router.back() should NOT be called
            expect(mockBack).not.toHaveBeenCalled();

            // 5. Instructions should be hidden (showInstructions = false)
            await waitFor(() => {
              expect(screen.queryByText(examConfig.instructionsTitle)).not.toBeInTheDocument();
            });

            // 6. Exam questions should be visible
            await waitFor(() => {
              const questions = screen.getAllByText('Sample Question');
              expect(questions.length).toBeGreaterThan(0);
            });

            // Cleanup
            startButton.removeEventListener('click', clickHandler, { capture: true });
          } finally {
            // Always unmount to clean up
            unmount();
          }
        }
      ),
      {
        // Run with limited examples for deterministic bug
        numRuns: 5,
        // Verbose output to see counterexamples
        verbose: true,
      }
    );
  }, 15000);

  /**
   * Concrete Test Case: Basic Start Exam Click
   * 
   * This is a concrete test case that demonstrates the bug in the simplest scenario.
   * It's easier to debug than the property-based test.
   * 
   * EXPECTED OUTCOME: This test WILL FAIL on unfixed code.
   */
  test('Concrete Case: Start Exam button click should prevent default behavior', async () => {
    // Setup: Create exam with instructions enabled, no acknowledgment required
    const mockExamData = {
      exam: {
        _id: 'test-exam-123',
        title: 'Test Exam',
        duration: 60,
        instructions: {
          enabled: true,
          requireAcknowledgment: false,
          title: 'Exam Instructions',
          content: '<p>Please read these instructions carefully.</p>',
        },
        questions: [
          {
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
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

    render(<StudentExam />);

    // Wait for exam to load
    await waitFor(() => {
      expect(screen.getByText('Exam Instructions')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start Exam');

    // Track if preventDefault was called
    let preventDefaultCalled = false;
    const clickListener = (event) => {
      const original = event.preventDefault.bind(event);
      event.preventDefault = () => {
        preventDefaultCalled = true;
        original();
      };
    };

    startButton.addEventListener('click', clickListener, { capture: true });

    // Click the button
    fireEvent.click(startButton);

    // Wait for state update
    await waitFor(() => {
      expect(screen.queryByText('Exam Instructions')).not.toBeInTheDocument();
    });

    // ASSERT: preventDefault should have been called
    // EXPECTED TO FAIL: The unfixed code doesn't call preventDefault()
    expect(preventDefaultCalled).toBe(true);

    // Cleanup
    startButton.removeEventListener('click', clickListener, { capture: true });
  });

  /**
   * Concrete Test Case: Start Exam with Acknowledgment Required
   * 
   * Tests the bug condition when acknowledgment is required and checked.
   * 
   * EXPECTED OUTCOME: This test WILL FAIL on unfixed code.
   */
  test('Concrete Case: Start Exam with acknowledgment should prevent navigation', async () => {
    const mockExamData = {
      exam: {
        _id: 'test-exam-123',
        title: 'Test Exam',
        duration: 60,
        instructions: {
          enabled: true,
          requireAcknowledgment: true,
          title: 'Important Instructions',
          content: '<p>Read carefully before starting.</p>',
          acknowledgmentText: 'I have read and understood the instructions',
        },
        questions: [
          {
            question: 'Sample Question',
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
      expect(screen.getByText('Important Instructions')).toBeInTheDocument();
    });

    // Check the acknowledgment checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });

    const startButton = screen.getByText('Start Exam');

    // Track browser history
    const historyBefore = window.history.length;

    // Click Start Exam
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.queryByText('Important Instructions')).not.toBeInTheDocument();
    });

    // ASSERT: Browser history should not change
    // EXPECTED TO FAIL: Browser navigation occurs
    const historyAfter = window.history.length;
    expect(historyAfter).toBe(historyBefore);

    // ASSERT: Router.back() should not be called
    expect(mockBack).not.toHaveBeenCalled();
  });
});
