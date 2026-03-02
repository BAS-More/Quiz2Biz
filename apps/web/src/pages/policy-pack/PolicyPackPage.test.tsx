import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PolicyPackPage } from './PolicyPackPage';
import { questionnaireApi } from '../../api/questionnaire';

// Mock the API
vi.mock('../../api/questionnaire', () => {
  const questionnaireApi = {
    generatePolicyPack: vi.fn(),
  };
  
  return {
    questionnaireApi,
  };
});

// Mock useNavigate only - let useParams work with MemoryRouter
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
    dimensionsCovered: ['Security', 'Compliance', 'Data Protection', 'Access Control', 'Infrastructure'],
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
    vi.mocked(questionnaireApi.generatePolicyPack).mockResolvedValue(mockPolicyPackData);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderPolicyPackPage = (sessionId: string = 'session-123') => {
    const user = userEvent.setup();
    const result = render(
      <MemoryRouter initialEntries={[`/policy-pack/${sessionId}`]}>
        <Routes>
          <Route path="/policy-pack/:sessionId" element={<PolicyPackPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
    return { ...result, user };
  };

  describe('Initial State', () => {
    it('renders initial page with generate button', () => {
      renderPolicyPackPage();

      // Should show back link
      expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();

      // Should show page title
      expect(screen.getByText('Policy Pack Generator')).toBeInTheDocument();

      // Should show description
      expect(screen.getByText(/Generate OPA policies, Terraform rules, and governance documents/)).toBeInTheDocument();

      // Should show generate button
      const generateButton = screen.getByText('Generate Policy Pack');
      expect(generateButton).toBeInTheDocument();
      expect(generateButton).not.toBeDisabled();

      // Should show helper text
      expect(screen.getByText(/This will analyze session gaps and produce policy documents/)).toBeInTheDocument();
    });

    it('navigates back to dashboard when back link is clicked', () => {
      renderPolicyPackPage();

      const backLink = screen.getByText('← Back to Dashboard');
      expect(backLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Policy Generation', () => {
    it('calls API when generate button is clicked', async () => {
      const { user } = renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      await user.click(generateButton);

      await waitFor(() => {
        expect(questionnaireApi.generatePolicyPack).toHaveBeenCalledWith('session-123');
      });
    });

    it('shows loading state during generation', async () => {
      // Make the API call take some time
      vi.mocked(questionnaireApi.generatePolicyPack).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPolicyPackData), 100))
      );

      const { user } = renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      await user.click(generateButton);

      // Should show loading state
      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(screen.getByText('Generating...').closest('button')).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
      });
    });

    it('displays error when generation fails', async () => {
      vi.mocked(questionnaireApi.generatePolicyPack).mockRejectedValue(new Error('Generation failed'));

      const { user } = renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Generation failed')).toBeInTheDocument();
      });

      // Error should be displayed in error banner
      const errorBanner = screen.getByText('Generation failed').closest('div');
      expect(errorBanner).toHaveStyle({ background: '#fef2f2' });
      expect(errorBanner).toHaveStyle({ color: '#dc2626' });
    });

    it('displays error with API message', async () => {
      const apiError = {
        response: {
          data: {
            message: 'Session not found or not completed',
          },
        },
      };
      vi.mocked(questionnaireApi.generatePolicyPack).mockRejectedValue(apiError);

      const { user } = renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Session not found or not completed')).toBeInTheDocument();
      });
    });
  });

  describe('Generated Policy Pack Display', () => {
    it('displays summary cards after successful generation', async () => {
      const { user } = renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Policies')).toBeInTheDocument();
      });

      // Should show counts and labels
      expect(screen.getByText('Policies')).toBeInTheDocument();
      expect(screen.getByText('OPA Rules')).toBeInTheDocument();
      expect(screen.getByText('Dimensions')).toBeInTheDocument();
    });

    it('displays individual policies with titles and descriptions', async () => {
      const { user } = renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Security Policy')).toBeInTheDocument();
      });

      // Should show all policy titles
      expect(screen.getByText('Security Policy')).toBeInTheDocument();
      expect(screen.getByText('Data Protection Policy')).toBeInTheDocument();
      expect(screen.getByText('Access Control Policy')).toBeInTheDocument();

      // Should show policy descriptions
      expect(screen.getByText('Comprehensive security requirements for cloud infrastructure')).toBeInTheDocument();
      expect(screen.getByText('Guidelines for handling sensitive data and compliance requirements')).toBeInTheDocument();
      expect(screen.getByText('Role-based access control implementation guidelines')).toBeInTheDocument();

      // Should show policy cards
      const securityPolicyCard = screen.getByText('Security Policy').closest('div');
      expect(securityPolicyCard).toHaveStyle({ padding: '16px' });
    });

    it('displays Terraform rules when available', async () => {
      const { user } = renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      await user.click(generateButton);

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
      vi.mocked(questionnaireApi.generatePolicyPack).mockResolvedValue(emptyPolicyPack);

      const { user } = renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      await user.click(generateButton);

      await waitFor(() => {
        const zeroElements = screen.getAllByText('0');
        expect(zeroElements.length).toBeGreaterThanOrEqual(3); // Policies, OPA Rules, Dimensions
      });

      // Should not show policy cards when empty
      expect(screen.queryByText('Policy 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Terraform Rules')).not.toBeInTheDocument();
    });

    it('handles missing session ID gracefully', async () => {
      // Render without a sessionId in the route
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={['/policy-pack']}>
          <Routes>
            <Route path="/policy-pack" element={<PolicyPackPage />} />
          </Routes>
        </MemoryRouter>
      );

      const generateButton = screen.getByText('Generate Policy Pack');
      await user.click(generateButton);

      // Should not crash and should not call API
      expect(questionnaireApi.generatePolicyPack).not.toHaveBeenCalled();
    });
  });

  describe('UI Behavior', () => {
    it('maintains button disabled state during API call', async () => {
      // Use a mock that doesn't resolve immediately to observe loading state
      let resolveGenerate!: (value: typeof mockPolicyPackData) => void;
      vi.mocked(questionnaireApi.generatePolicyPack).mockImplementation(
        () => new Promise(resolve => { resolveGenerate = resolve; })
      );

      const { user } = renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      
      // Initially enabled
      expect(generateButton).not.toBeDisabled();
      
      await user.click(generateButton);
      
      // Should be disabled during API call
      const loadingButton = screen.getByText('Generating...');
      expect(loadingButton.closest('button')).toBeDisabled();

      // Resolve to clean up
      resolveGenerate(mockPolicyPackData);
    });

    it('shows proper cursor states', async () => {
      // Use a mock that doesn't resolve immediately to observe loading state
      vi.mocked(questionnaireApi.generatePolicyPack).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { user } = renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      expect(generateButton).toHaveStyle({ cursor: 'pointer' });

      await user.click(generateButton);

      // During loading, cursor should be not-allowed
      const loadingButton = screen.getByText('Generating...');
      expect(loadingButton).toHaveStyle({ cursor: 'not-allowed' });
    });
  });
});