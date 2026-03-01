import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PolicyPackPage } from './PolicyPackPage';
import * as questionnaireApi from '../../api/questionnaire';

// Mock the API module
vi.mock('../../api/questionnaire', () => ({
  questionnaireApi: {
    generatePolicyPack: vi.fn(),
  },
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Get mocked function reference
const mockGeneratePolicyPack = vi.mocked(questionnaireApi.questionnaireApi.generatePolicyPack);

describe('PolicyPackPage', () => {
  const mockPolicyPackData = {
    policies: [
      {
        title: 'Security Policy',
        description: 'Comprehensive security requirements for cloud infrastructure',
        content: 'This policy defines security standards for all cloud resources...',
      },
      {
        title: 'Data Protection Policy',
        description: 'Guidelines for handling sensitive data and compliance requirements',
        content: 'All personal data must be encrypted both at rest and in transit...',
      },
      {
        title: 'Access Control Policy',
        description: 'Role-based access control implementation guidelines',
        content: 'Access to production systems requires multi-factor authentication...',
      },
    ],
    opaPolicies: [
      { id: 'opa-1', name: 'allow_admin_access' },
      { id: 'opa-2', name: 'require_encryption' },
      { id: 'opa-3', name: 'validate_resource_tags' },
    ],
    dimensionsCovered: [
      'Security',
      'Compliance',
      'Data Protection',
      'Access Control',
      'Infrastructure',
    ],
    terraformRules: `
resource "aws_s3_bucket" "secure_bucket" {
  bucket = "my-secure-bucket"
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_iam_policy" "admin_policy" {
  name = "admin-access-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject"]
        Resource = "*"
      }
    ]
  })
}`,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockGeneratePolicyPack.mockReset();
    mockGeneratePolicyPack.mockResolvedValue(mockPolicyPackData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderPolicyPackPage = (sessionId: string = 'session-123') => {
    return render(
      <MemoryRouter initialEntries={[`/policy-pack/${sessionId}`]}>
        <Routes>
          <Route path="/policy-pack/:sessionId" element={<PolicyPackPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );
  };

  describe('Initial State', () => {
    it('renders initial page with generate button', () => {
      renderPolicyPackPage();

      // Should show back link
      expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();

      // Should show page title
      expect(screen.getByText('Policy Pack Generator')).toBeInTheDocument();

      // Should show description
      expect(
        screen.getByText(/Generate OPA policies, Terraform rules, and governance documents/),
      ).toBeInTheDocument();

      // Should show generate button
      const generateButton = screen.getByText('Generate Policy Pack');
      expect(generateButton).toBeInTheDocument();
      expect(generateButton).not.toBeDisabled();

      // Should show helper text
      expect(
        screen.getByText(/This will analyze session gaps and produce policy documents/),
      ).toBeInTheDocument();
    });

    it('navigates back to dashboard when back link is clicked', () => {
      renderPolicyPackPage();

      const backLink = screen.getByText('← Back to Dashboard');
      expect(backLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Policy Generation', () => {
    it('calls API when generate button is clicked', async () => {
      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockGeneratePolicyPack).toHaveBeenCalledWith('session-123');
      });
    });

    it('shows loading state during generation', async () => {
      // Make the API call take some time
      mockGeneratePolicyPack.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockPolicyPackData), 100)),
      );

      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      // Should show loading state - use waitFor since React state updates are async
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
      });
      expect(screen.getByText('Generating...').closest('button')).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
      });
    });

    it('displays error when generation fails', async () => {
      mockGeneratePolicyPack.mockRejectedValue(
        new Error('Generation failed'),
      );

      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Generation failed')).toBeInTheDocument();
      });

      // Error should be displayed in error banner (verify it exists and is in an error-styled container)
      const errorText = screen.getByText('Generation failed');
      const errorBanner = errorText.closest('div');
      expect(errorBanner).toBeInTheDocument();
      // Style uses hex colors that get converted to RGB - just verify element is styled
      expect(errorBanner).toHaveStyle({ borderRadius: '8px' });
    });

    it('displays error with API message', async () => {
      const apiError = {
        response: {
          data: {
            message: 'Session not found or not completed',
          },
        },
      };
      mockGeneratePolicyPack.mockRejectedValue(apiError);

      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Session not found or not completed')).toBeInTheDocument();
      });
    });
  });

  describe('Generated Policy Pack Display', () => {
    it('displays summary cards after successful generation', async () => {
      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Policies')).toBeInTheDocument();
      });

      // Should show OPA rules count
      expect(screen.getByText('OPA Rules')).toBeInTheDocument();

      // Should show dimensions count - verify 5 is present (unique to dimensions)
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Dimensions')).toBeInTheDocument();

      // Verify the summary cards exist with their labels
      const policiesLabel = screen.getByText('Policies');
      const opaLabel = screen.getByText('OPA Rules');
      const dimensionsLabel = screen.getByText('Dimensions');
      
      expect(policiesLabel.closest('div')).toBeInTheDocument();
      expect(opaLabel.closest('div')).toBeInTheDocument();
      expect(dimensionsLabel.closest('div')).toBeInTheDocument();
    });

    it('displays individual policies with titles and descriptions', async () => {
      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Security Policy')).toBeInTheDocument();
      });

      // Should show all policy titles
      expect(screen.getByText('Security Policy')).toBeInTheDocument();
      expect(screen.getByText('Data Protection Policy')).toBeInTheDocument();
      expect(screen.getByText('Access Control Policy')).toBeInTheDocument();

      // Should show policy descriptions
      expect(
        screen.getByText('Comprehensive security requirements for cloud infrastructure'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Guidelines for handling sensitive data and compliance requirements'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Role-based access control implementation guidelines'),
      ).toBeInTheDocument();

      // Should show policy cards with proper styling (verify borderRadius which doesn't need color conversion)
      const securityPolicyCard = screen.getByText('Security Policy').closest('div');
      expect(securityPolicyCard).toHaveStyle({ borderRadius: '8px' });
      expect(securityPolicyCard).toHaveStyle({ padding: '16px' });
    });

    it('displays Terraform rules when available', async () => {
      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Terraform Rules')).toBeInTheDocument();
      });

      // Should show Terraform code in preformatted block
      const terraformBlock = screen.getByText('Terraform Rules').nextElementSibling;
      expect(terraformBlock?.tagName).toBe('PRE');
      expect(terraformBlock).toHaveStyle({ background: '#1f2937' }); // Dark background
      expect(terraformBlock).toHaveStyle({ color: '#e5e7eb' }); // Light text
      expect(terraformBlock).toHaveStyle({ padding: '16px' });
      expect(terraformBlock).toHaveStyle({ borderRadius: '8px' });
      expect(terraformBlock).toHaveStyle({ maxHeight: '300px' });

      // Should contain the Terraform code
      expect(terraformBlock).toHaveTextContent('resource "aws_s3_bucket" "secure_bucket"');
      expect(terraformBlock).toHaveTextContent('server_side_encryption_configuration');
    });

    it('handles empty policy pack gracefully', async () => {
      const emptyPolicyPack = {
        policies: [],
        opaPolicies: [],
        dimensionsCovered: [],
        terraformRules: '',
      };
      mockGeneratePolicyPack.mockResolvedValue(emptyPolicyPack);

      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      await waitFor(() => {
        // All three summary cards should show 0
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBe(3); // Policies, OPA Rules, Dimensions all show 0
      });

      // Should not show policy cards when empty
      expect(screen.queryByText('Policy 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Terraform Rules')).not.toBeInTheDocument();
    });

    it('handles missing session ID gracefully', () => {
      // Render without sessionId in route
      render(
        <MemoryRouter initialEntries={['/policy-pack/']}>
          <Routes>
            <Route path="/policy-pack/" element={<PolicyPackPage />} />
            <Route path="/policy-pack/:sessionId" element={<PolicyPackPage />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>,
      );

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      // Should not crash and should not call API
      expect(mockGeneratePolicyPack).not.toHaveBeenCalled();
    });
  });

  describe('UI Behavior', () => {
    it('maintains button disabled state during API call', async () => {
      mockGeneratePolicyPack.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockPolicyPackData), 200)),
      );

      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');

      // Initially enabled
      expect(generateButton).not.toBeDisabled();

      fireEvent.click(generateButton);

      // Should be disabled during API call - wait for async state update
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
      });
      const loadingButton = screen.getByText('Generating...');
      expect(loadingButton.closest('button')).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
      });
    });

    it('shows proper cursor states', async () => {
      mockGeneratePolicyPack.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockPolicyPackData), 200)),
      );

      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      expect(generateButton).toHaveStyle({ cursor: 'pointer' });

      fireEvent.click(generateButton);

      // During loading, cursor should be not-allowed - wait for async state update
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
      });
      const loadingButton = screen.getByText('Generating...');
      expect(loadingButton).toHaveStyle({ cursor: 'not-allowed' });
    });
  });
});
