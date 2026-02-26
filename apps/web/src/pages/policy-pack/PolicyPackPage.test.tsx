import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

// Mock useNavigate and useParams
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ sessionId: 'session-123' }),
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
    vi.restoreAllMocks();
  });

  const renderPolicyPackPage = (sessionId: string = 'session-123') => {
    return render(
      <MemoryRouter initialEntries={[`/policy-pack/${sessionId}`]}>
        <Routes>
          <Route path="/policy-pack/:sessionId" element={<PolicyPackPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
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
      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(questionnaireApi.generatePolicyPack).toHaveBeenCalledWith('session-123');
      });
    });

    it('shows loading state during generation', async () => {
      // Make the API call take some time
      vi.mocked(questionnaireApi.generatePolicyPack).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPolicyPackData), 100))
      );

      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      // Should show loading state
      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(screen.getByText('Generating...').closest('button')).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
      });
    });

    it('displays error when generation fails', async () => {
      vi.mocked(questionnaireApi.generatePolicyPack).mockRejectedValue(new Error('Generation failed'));

      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Generation failed')).toBeInTheDocument();
      });

      // Error should be displayed in error banner
      const errorBanner = screen.getByText('Generation failed').closest('div');
      expect(errorBanner).toHaveStyle({ background: '#fef2f2' });
      expect(errorBanner).toHaveStyle({ border: '1px solid #fecaca' });
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
        expect(screen.getByText('3')).toBeInTheDocument(); // Policies count
        expect(screen.getByText('Policies')).toBeInTheDocument();
      });

      // Should show OPA rules count
      expect(screen.getByText('3')).toBeInTheDocument(); // OPA Rules count
      expect(screen.getByText('OPA Rules')).toBeInTheDocument();

      // Should show dimensions count
      expect(screen.getByText('5')).toBeInTheDocument(); // Dimensions count
      expect(screen.getByText('Dimensions')).toBeInTheDocument();

      // Should show summary cards with correct styling
      const policyCard = screen.getByText('3').closest('div');
      expect(policyCard).toHaveStyle({ background: '#dbeafe' }); // Light blue

      const opaCard = screen.getByText('OPA Rules').closest('div');
      expect(opaCard).toHaveStyle({ background: '#f3e8ff' }); // Light purple

      const dimensionsCard = screen.getByText('Dimensions').closest('div');
      expect(dimensionsCard).toHaveStyle({ background: '#dcfce7' }); // Light green
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
      expect(screen.getByText('Comprehensive security requirements for cloud infrastructure')).toBeInTheDocument();
      expect(screen.getByText('Guidelines for handling sensitive data and compliance requirements')).toBeInTheDocument();
      expect(screen.getByText('Role-based access control implementation guidelines')).toBeInTheDocument();

      // Should show policy cards with proper styling
      const policyCards = screen.getAllByText(/Policy/).map(el => el.closest('div'));
      policyCards.forEach(card => {
        expect(card).toHaveStyle({ border: '1px solid #e5e7eb' });
        expect(card).toHaveStyle({ borderRadius: '8px' });
        expect(card).toHaveStyle({ padding: '16px' });
      });
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
      vi.mocked(questionnaireApi.generatePolicyPack).mockResolvedValue(emptyPolicyPack);

      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument(); // Policies count
        expect(screen.getByText('0')).toBeInTheDocument(); // OPA Rules count
        expect(screen.getByText('0')).toBeInTheDocument(); // Dimensions count
      });

      // Should not show policy cards when empty
      expect(screen.queryByText('Policy 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Terraform Rules')).not.toBeInTheDocument();
    });

    it('handles missing session ID gracefully', () => {
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useParams: () => ({ sessionId: undefined }),
        };
      });

      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      fireEvent.click(generateButton);

      // Should not crash and should not call API
      expect(questionnaireApi.generatePolicyPack).not.toHaveBeenCalled();
    });
  });

  describe('UI Behavior', () => {
    it('maintains button disabled state during API call', async () => {
      vi.mocked(questionnaireApi.generatePolicyPack).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPolicyPackData), 200))
      );

      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      
      // Initially enabled
      expect(generateButton).not.toBeDisabled();
      
      fireEvent.click(generateButton);
      
      // Should be disabled during API call
      expect(generateButton).toBeDisabled();
      expect(screen.getByText('Generating...')).toBeInTheDocument();
      
      // Wait for completion
      await waitFor(() => {
        expect(generateButton).not.toBeDisabled();
        expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
      });
    });

    it('shows proper cursor states', () => {
      renderPolicyPackPage();

      const generateButton = screen.getByText('Generate Policy Pack');
      expect(generateButton).toHaveStyle({ cursor: 'pointer' });

      fireEvent.click(generateButton);

      // During loading, cursor should be not-allowed
      const loadingButton = screen.getByText('Generating...');
      expect(loadingButton).toHaveStyle({ cursor: 'not-allowed' });
    });
  });
});