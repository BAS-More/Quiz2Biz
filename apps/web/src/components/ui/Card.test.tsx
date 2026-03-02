import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader } from './Card';
import { Star } from 'lucide-react';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies default padding (md)', () => {
    render(<Card>Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('p-6');
  });

  it('applies small padding', () => {
    render(<Card padding="sm">Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('p-4');
  });

  it('applies large padding', () => {
    render(<Card padding="lg">Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('p-8');
  });

  it('applies no padding', () => {
    render(<Card padding="none">Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).not.toHaveClass('p-4');
    expect(card).not.toHaveClass('p-6');
    expect(card).not.toHaveClass('p-8');
  });

  it('does not have hover effects by default', () => {
    render(<Card>Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).not.toHaveClass('hover:shadow-elevated');
    expect(card).not.toHaveClass('hover:border-surface-300/60');
  });

  it('applies hover effects when hover prop is true', () => {
    render(<Card hover>Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('hover:shadow-elevated');
    expect(card).toHaveClass('hover:border-surface-300/60');
    expect(card).toHaveClass('transition-all');
    expect(card).toHaveClass('duration-200');
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('custom-class');
  });

  it('passes through HTML attributes', () => {
    render(<Card id="test-card" data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('id', 'test-card');
  });

  it('combines all props correctly', () => {
    render(
      <Card padding="lg" hover className="my-custom-class" id="combined-card">
        Combined Content
      </Card>
    );
    const card = screen.getByText('Combined Content').closest('div');
    
    // Check padding
    expect(card).toHaveClass('p-8');
    
    // Check hover effects
    expect(card).toHaveClass('hover:shadow-elevated');
    expect(card).toHaveClass('hover:border-surface-300/60');
    
    // Check custom class
    expect(card).toHaveClass('my-custom-class');
    
    // Check HTML attribute
    expect(card).toHaveAttribute('id', 'combined-card');
  });
});

describe('CardHeader', () => {
  it('renders title correctly', () => {
    render(<CardHeader title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toHaveClass('text-base');
    expect(screen.getByText('Test Title')).toHaveClass('font-semibold');
  });

  it('renders subtitle when provided', () => {
    render(<CardHeader title="Test Title" subtitle="Test Subtitle" />);
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toHaveClass('text-sm');
    expect(screen.getByText('Test Subtitle')).toHaveClass('text-surface-500');
  });

  it('does not render subtitle when not provided', () => {
    render(<CardHeader title="Test Title" />);
    expect(screen.queryByText('Test Subtitle')).not.toBeInTheDocument();
  });

  it('renders action when provided', () => {
    const action = <button>Click Me</button>;
    render(<CardHeader title="Test Title" action={action} />);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('does not render action when not provided', () => {
    render(<CardHeader title="Test Title" />);
    expect(screen.queryByText('Click Me')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const icon = <Star data-testid="star-icon" />;
    render(<CardHeader title="Test Title" icon={icon} />);
    expect(screen.getByTestId('star-icon')).toBeInTheDocument();
  });

  it('does not render icon when not provided', () => {
    render(<CardHeader title="Test Title" />);
    expect(screen.queryByTestId('star-icon')).not.toBeInTheDocument();
  });

  it('renders icon with correct styling', () => {
    const icon = <Star data-testid="star-icon" />;
    render(<CardHeader title="Test Title" icon={icon} />);
    const iconContainer = screen.getByTestId('star-icon').closest('div');
    expect(iconContainer).toHaveClass('w-9');
    expect(iconContainer).toHaveClass('h-9');
    expect(iconContainer).toHaveClass('rounded-lg');
    expect(iconContainer).toHaveClass('bg-brand-50');
    expect(iconContainer).toHaveClass('text-brand-600');
  });

  it('renders all elements together correctly', () => {
    const icon = <Star data-testid="star-icon" />;
    const action = <button>Click Me</button>;
    
    render(
      <CardHeader 
        title="Complete Header" 
        subtitle="With all elements" 
        icon={icon} 
        action={action} 
      />
    );
    
    // Check all elements are present
    expect(screen.getByText('Complete Header')).toBeInTheDocument();
    expect(screen.getByText('With all elements')).toBeInTheDocument();
    expect(screen.getByTestId('star-icon')).toBeInTheDocument();
    expect(screen.getByText('Click Me')).toBeInTheDocument();
    
    // Check layout structure by examining the outermost container
    const container = screen.getByText('Complete Header').closest('div')?.parentElement?.parentElement;
    expect(container).toHaveClass('flex');
    expect(container).toHaveClass('items-center');
    expect(container).toHaveClass('justify-between');
    expect(container).toHaveClass('mb-4');
  });
});