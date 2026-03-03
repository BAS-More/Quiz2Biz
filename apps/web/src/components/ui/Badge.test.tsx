import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies default variant styles', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('bg-surface-100');
    expect(badge).toHaveClass('text-surface-700');
  });

  it('applies brand variant styles', () => {
    render(<Badge variant="brand">Brand</Badge>);
    const badge = screen.getByText('Brand');
    expect(badge).toHaveClass('bg-brand-50');
    expect(badge).toHaveClass('text-brand-700');
  });

  it('applies success variant styles', () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText('Success');
    expect(badge).toHaveClass('bg-success-50');
    expect(badge).toHaveClass('text-success-700');
  });

  it('applies warning variant styles', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText('Warning');
    expect(badge).toHaveClass('bg-warning-50');
    expect(badge).toHaveClass('text-warning-600');
  });

  it('applies danger variant styles', () => {
    render(<Badge variant="danger">Danger</Badge>);
    const badge = screen.getByText('Danger');
    expect(badge).toHaveClass('bg-danger-50');
    expect(badge).toHaveClass('text-danger-600');
  });

  it('applies accent variant styles', () => {
    render(<Badge variant="accent">Accent</Badge>);
    const badge = screen.getByText('Accent');
    expect(badge).toHaveClass('bg-accent-50');
    expect(badge).toHaveClass('text-accent-700');
  });

  it('applies small size styles', () => {
    render(<Badge size="sm">Small</Badge>);
    const badge = screen.getByText('Small');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('px-2');
    expect(badge).toHaveClass('py-0.5');
  });

  it('applies medium size styles', () => {
    render(<Badge size="md">Medium</Badge>);
    const badge = screen.getByText('Medium');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('px-2.5');
    expect(badge).toHaveClass('py-1');
  });

  it('shows dot when dot prop is true', () => {
    render(<Badge dot>With Dot</Badge>);
    const badge = screen.getByText('With Dot');
    const dot = badge.querySelector('span');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('w-1.5');
    expect(dot).toHaveClass('h-1.5');
    expect(dot).toHaveClass('rounded-full');
    expect(dot).toHaveClass('mr-1.5');
  });

  it('applies correct dot color for default variant', () => {
    render(
      <Badge dot variant="default">
        Default
      </Badge>,
    );
    const badge = screen.getByText('Default');
    const dot = badge.querySelector('span');
    expect(dot).toHaveClass('bg-surface-400');
  });

  it('applies correct dot color for brand variant', () => {
    render(
      <Badge dot variant="brand">
        Brand
      </Badge>,
    );
    const badge = screen.getByText('Brand');
    const dot = badge.querySelector('span');
    expect(dot).toHaveClass('bg-brand-500');
  });

  it('applies correct dot color for success variant', () => {
    render(
      <Badge dot variant="success">
        Success
      </Badge>,
    );
    const badge = screen.getByText('Success');
    const dot = badge.querySelector('span');
    expect(dot).toHaveClass('bg-success-500');
  });

  it('applies correct dot color for warning variant', () => {
    render(
      <Badge dot variant="warning">
        Warning
      </Badge>,
    );
    const badge = screen.getByText('Warning');
    const dot = badge.querySelector('span');
    expect(dot).toHaveClass('bg-warning-500');
  });

  it('applies correct dot color for danger variant', () => {
    render(
      <Badge dot variant="danger">
        Danger
      </Badge>,
    );
    const badge = screen.getByText('Danger');
    const dot = badge.querySelector('span');
    expect(dot).toHaveClass('bg-danger-500');
  });

  it('applies correct dot color for accent variant', () => {
    render(
      <Badge dot variant="accent">
        Accent
      </Badge>,
    );
    const badge = screen.getByText('Accent');
    const dot = badge.querySelector('span');
    expect(dot).toHaveClass('bg-accent-500');
  });

  it('does not show dot when dot prop is false', () => {
    render(<Badge dot={false}>No Dot</Badge>);
    const badge = screen.getByText('No Dot');
    const dots = badge.querySelectorAll('span');
    // Should have no dot spans when dot is false
    expect(dots.length).toBe(0);
  });

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge).toHaveClass('custom-class');
  });

  it('combines all props correctly', () => {
    render(
      <Badge variant="success" size="md" dot className="my-custom-class">
        Complete
      </Badge>,
    );
    const badge = screen.getByText('Complete');

    // Check variant styles
    expect(badge).toHaveClass('bg-success-50');
    expect(badge).toHaveClass('text-success-700');

    // Check size styles
    expect(badge).toHaveClass('px-2.5');
    expect(badge).toHaveClass('py-1');

    // Check custom class
    expect(badge).toHaveClass('my-custom-class');

    // Check dot exists
    const dot = badge.querySelector('span');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('bg-success-500');
  });
});
