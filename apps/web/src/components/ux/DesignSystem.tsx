/**
 * Design System Documentation Component
 * Sprint 33: UX Polish & Enhancements
 *
 * Nielsen Heuristic: Consistency and Standards
 * - Unified design tokens and spacing scale
 * - Color palette documentation
 * - Typography system
 * - Component showcase
 */

import React, { useState, createContext, useContext, useMemo } from 'react';

// ============================================================================
// Design Tokens
// ============================================================================

export const SPACING_SCALE = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

export const COLOR_PALETTE = {
  // Primary colors
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  // Neutral colors
  neutral: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
  },
  // Success colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  // Warning colors
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  // Error colors
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", "Fira Mono", "Roboto Mono", monospace',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const BORDER_RADIUS = {
  none: '0px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
} as const;

export const SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const;

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const TRANSITIONS = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
  slower: '500ms ease',
} as const;

export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

// ============================================================================
// Theme Context
// ============================================================================

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: 'light' | 'dark';
  tokens: typeof designTokens;
}

const designTokens = {
  spacing: SPACING_SCALE,
  colors: COLOR_PALETTE,
  typography: TYPOGRAPHY,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  breakpoints: BREAKPOINTS,
  transitions: TRANSITIONS,
  zIndex: Z_INDEX,
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'light',
}) => {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);

  const resolvedMode = useMemo(() => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }, [mode]);

  const value: ThemeContextValue = {
    mode,
    setMode,
    resolvedMode,
    tokens: designTokens,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// ============================================================================
// Design System Viewer Components
// ============================================================================

export interface ColorSwatchProps {
  name: string;
  color: string;
  textColor?: string;
}

export const ColorSwatch: React.FC<ColorSwatchProps> = ({ name, color, textColor = '#000' }) => (
  <div className={styles.colorSwatch}>
    <div
      className={styles.colorSwatchBox}
      style={{ backgroundColor: color, color: textColor }}
    >
      {color}
    </div>
    <span className={styles.colorSwatchName}>{name}</span>
  </div>
);

export interface ColorPaletteDisplayProps {
  name: string;
  colors: Record<string | number, string>;
}

export const ColorPaletteDisplay: React.FC<ColorPaletteDisplayProps> = ({ name, colors }) => (
  <div className={styles.colorPalette}>
    <h4 className={styles.paletteName}>{name}</h4>
    <div className={styles.paletteGrid}>
      {Object.entries(colors).map(([shade, color]) => (
        <ColorSwatch
          key={shade}
          name={shade}
          color={color}
          textColor={parseInt(shade) >= 500 ? '#FFF' : '#000'}
        />
      ))}
    </div>
  </div>
);

export const SpacingScale: React.FC = () => (
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Spacing Scale</h3>
    <p className={styles.sectionDesc}>
      Consistent spacing using a 4px base unit. Use these values for margins, padding, and gaps.
    </p>
    <div className={styles.spacingGrid}>
      {Object.entries(SPACING_SCALE).map(([key, value]) => (
        <div key={key} className={styles.spacingItem}>
          <div
            className={styles.spacingBox}
            style={{ width: value, height: value }}
          />
          <div className={styles.spacingLabel}>
            <span className={styles.spacingKey}>{key}</span>
            <span className={styles.spacingValue}>{value}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const TypographyScale: React.FC = () => (
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Typography</h3>
    <p className={styles.sectionDesc}>
      Consistent font sizes and weights for readable, accessible text.
    </p>

    <h4 className={styles.subsectionTitle}>Font Sizes</h4>
    <div className={styles.typographyList}>
      {Object.entries(TYPOGRAPHY.fontSize).map(([key, value]) => (
        <div key={key} className={styles.typographyItem}>
          <span className={styles.typographySample} style={{ fontSize: value }}>The quick brown fox</span>
          <span className={styles.typographyMeta}>
            {key}: {value}
          </span>
        </div>
      ))}
    </div>

    <h4 className={styles.subsectionTitle}>Font Weights</h4>
    <div className={styles.typographyList}>
      {Object.entries(TYPOGRAPHY.fontWeight).map(([key, value]) => (
        <div key={key} className={styles.typographyItem}>
          <span className={styles.typographySample} style={{ fontWeight: value }}>The quick brown fox</span>
          <span className={styles.typographyMeta}>
            {key}: {value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const BorderRadiusScale: React.FC = () => (
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Border Radius</h3>
    <div className={styles.radiusGrid}>
      {Object.entries(BORDER_RADIUS).map(([key, value]) => (
        <div key={key} className={styles.radiusItem}>
          <div
            className={styles.radiusBox}
            style={{ borderRadius: value }}
          />
          <span className={styles.radiusLabel}>
            {key}: {value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const ShadowScale: React.FC = () => (
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Shadows</h3>
    <div className={styles.shadowGrid}>
      {Object.entries(SHADOWS).map(([key, value]) => (
        <div key={key} className={styles.shadowItem}>
          <div
            className={styles.shadowBox}
            style={{ boxShadow: value }}
          />
          <span className={styles.shadowLabel}>{key}</span>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================================
// Button Variants Showcase
// ============================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...props
}) => {
  const variantClasses: Record<string, string> = {
    primary: 'bg-brand-600 text-white border-none',
    secondary: 'bg-surface-50 text-surface-700 border border-surface-300',
    ghost: 'bg-transparent text-surface-700 border-none',
    danger: 'bg-danger-600 text-white border-none',
    success: 'bg-success-600 text-white border-none',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-md',
    lg: 'px-6 py-3 text-lg rounded-lg',
  };

  return (
    <button
      className={`${styles.button} ${variantClasses[variant]} ${sizeClasses[size]}`}
      style={{
        opacity: disabled || isLoading ? 0.6 : 1,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        ...style,
      }}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className={styles.spinner}>⏳</span>}
      {leftIcon && !isLoading && <span className={styles.buttonIcon}>{leftIcon}</span>}
      {children}
      {rightIcon && <span className={styles.buttonIcon}>{rightIcon}</span>}
    </button>
  );
};

export const ButtonShowcase: React.FC = () => (
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Buttons</h3>

    <h4 className={styles.subsectionTitle}>Variants</h4>
    <div className={styles.buttonRow}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="success">Success</Button>
    </div>

    <h4 className={styles.subsectionTitle}>Sizes</h4>
    <div className={styles.buttonRow}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>

    <h4 className={styles.subsectionTitle}>States</h4>
    <div className={styles.buttonRow}>
      <Button>Normal</Button>
      <Button disabled>Disabled</Button>
      <Button isLoading>Loading</Button>
    </div>

    <h4 className={styles.subsectionTitle}>With Icons</h4>
    <div className={styles.buttonRow}>
      <Button leftIcon="➕">Add Item</Button>
      <Button rightIcon="→">Next</Button>
      <Button leftIcon="💾" rightIcon="✓">
        Save
      </Button>
    </div>
  </div>
);

// ============================================================================
// Input Showcase
// ============================================================================

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftAddon,
  rightAddon,
  id,
  style,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2)}`;

  return (
    <div className={styles.inputWrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.inputLabel}>
          {label}
        </label>
      )}
      <div className={styles.inputContainer}>
        {leftAddon && <span className={styles.inputAddon}>{leftAddon}</span>}
        <input
          id={inputId}
          className={`${styles.input} ${error ? styles.inputError : ''} ${leftAddon ? 'pl-10' : ''} ${rightAddon ? 'pr-10' : ''}`}
          style={style}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {rightAddon && (
          <span className={`${styles.inputAddon} right-3 !left-auto`}>{rightAddon}</span>
        )}
      </div>
      {error && (
        <span id={`${inputId}-error`} className={styles.inputErrorText} role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${inputId}-hint`} className={styles.inputHint}>
          {hint}
        </span>
      )}
    </div>
  );
};

export const InputShowcase: React.FC = () => (
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Inputs</h3>

    <div className={styles.inputGrid}>
      <Input label="Default" placeholder="Enter text..." />
      <Input label="With Hint" placeholder="Enter email..." hint="We'll never share your email" />
      <Input label="With Error" placeholder="Enter password..." error="Password is required" />
      <Input label="Disabled" placeholder="Cannot edit" disabled />
      <Input label="With Left Addon" placeholder="Search..." leftAddon="🔍" />
      <Input label="With Right Addon" placeholder="Amount" rightAddon="USD" />
    </div>
  </div>
);

// ============================================================================
// Badge Component
// ============================================================================

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'md' }) => {
  const variantClasses: Record<string, string> = {
    default: 'bg-surface-100 text-surface-700',
    primary: 'bg-brand-100 text-brand-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    error: 'bg-danger-100 text-danger-700',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-1.5 py-0.5 text-[11px]',
    md: 'px-2 py-1 text-xs',
  };

  return (
    <span className={`${styles.badge} ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
};

export const BadgeShowcase: React.FC = () => (
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Badges</h3>
    <div className={styles.badgeRow}>
      <Badge>Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
    </div>
    <div className={`${styles.badgeRow} mt-3`}>
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
    </div>
  </div>
);

// ============================================================================
// Card Component
// ============================================================================

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  padding?: keyof typeof SPACING_SCALE;
  shadow?: keyof typeof SHADOWS;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  footer,
  padding = 6,
  shadow = 'md',
  className = '',
}) => (
  <div
    className={`design-card ${className} ${styles.card}`}
    style={{ padding: SPACING_SCALE[padding], boxShadow: SHADOWS[shadow] }}
  >
    {(title || subtitle) && (
      <div className={styles.cardHeader}>
        {title && <h4 className={styles.cardTitle}>{title}</h4>}
        {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
      </div>
    )}
    <div className={styles.cardContent}>{children}</div>
    {footer && <div className={styles.cardFooter}>{footer}</div>}
  </div>
);

export const CardShowcase: React.FC = () => (
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Cards</h3>
    <div className={styles.cardGrid}>
      <Card title="Basic Card" subtitle="With title and subtitle">
        <p>Card content goes here. Cards are versatile containers for related content.</p>
      </Card>
      <Card
        title="Card with Footer"
        footer={
          <div className={styles.cardFooterActions}>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
            <Button size="sm">Save</Button>
          </div>
        }
      >
        <p>This card has a footer with action buttons.</p>
      </Card>
      <Card shadow="lg" padding={8}>
        <p>Card with larger shadow and padding.</p>
      </Card>
    </div>
  </div>
);

// ============================================================================
// Alert Component
// ============================================================================

export interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ children, variant = 'info', title, onClose }) => {
  const variantConfig: Record<string, { classes: string; icon: string }> = {
    info: { classes: 'bg-brand-50 border-brand-200', icon: 'ℹ️' },
    success: { classes: 'bg-success-50 border-success-200', icon: '✅' },
    warning: { classes: 'bg-warning-50 border-warning-200', icon: '⚠️' },
    error: { classes: 'bg-danger-50 border-danger-200', icon: '❌' },
  };

  const { classes: variantClasses, icon } = variantConfig[variant];

  return (
    <div
      className={`${styles.alert} ${variantClasses}`}
      role="alert"
    >
      <span className={styles.alertIcon}>{icon}</span>
      <div className={styles.alertContent}>
        {title && <strong className={styles.alertTitle}>{title}</strong>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className={styles.alertClose} aria-label="Dismiss alert">
          ✕
        </button>
      )}
    </div>
  );
};

export const AlertShowcase: React.FC = () => (
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Alerts</h3>
    <div className={styles.alertStack}>
      <Alert variant="info" title="Information">
        This is an informational message.
      </Alert>
      <Alert variant="success" title="Success">
        Your changes have been saved successfully.
      </Alert>
      <Alert variant="warning" title="Warning">
        Please review your input before proceeding.
      </Alert>
      <Alert variant="error" title="Error">
        An error occurred. Please try again.
      </Alert>
    </div>
  </div>
);

// ============================================================================
// Complete Design System Viewer
// ============================================================================

type DesignSystemSection = 'colors' | 'spacing' | 'typography' | 'components';

export interface DesignSystemViewerProps {
  defaultSection?: DesignSystemSection;
}

export const DesignSystemViewer: React.FC<DesignSystemViewerProps> = ({
  defaultSection = 'colors',
}) => {
  const [activeSection, setActiveSection] = useState<DesignSystemSection>(defaultSection);

  const sections: Array<{ id: DesignSystemSection; label: string }> = [
    { id: 'colors', label: 'Colors' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'typography', label: 'Typography' },
    { id: 'components', label: 'Components' },
  ];

  return (
    <div className={styles.viewer}>
      <header className={styles.viewerHeader}>
        <h1 className={styles.viewerTitle}>Design System</h1>
        <p className={styles.viewerDesc}>Quiz2Biz unified design tokens and component library</p>
      </header>

      <nav className={styles.viewerNav}>
        {sections.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`${styles.navButton} ${activeSection === id ? styles.navButtonActive : ''}`}
            aria-current={activeSection === id ? 'page' : undefined}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className={styles.viewerContent}>
        {activeSection === 'colors' && (
          <>
            <ColorPaletteDisplay name="Primary" colors={COLOR_PALETTE.primary} />
            <ColorPaletteDisplay name="Neutral" colors={COLOR_PALETTE.neutral} />
            <ColorPaletteDisplay name="Success" colors={COLOR_PALETTE.success} />
            <ColorPaletteDisplay name="Warning" colors={COLOR_PALETTE.warning} />
            <ColorPaletteDisplay name="Error" colors={COLOR_PALETTE.error} />
          </>
        )}

        {activeSection === 'spacing' && (
          <>
            <SpacingScale />
            <BorderRadiusScale />
            <ShadowScale />
          </>
        )}

        {activeSection === 'typography' && <TypographyScale />}

        {activeSection === 'components' && (
          <>
            <ButtonShowcase />
            <InputShowcase />
            <BadgeShowcase />
            <CardShowcase />
            <AlertShowcase />
          </>
        )}
      </main>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = {
  colorSwatch: 'flex flex-col items-center gap-1',
  colorSwatchBox: 'w-20 h-12 rounded-md flex items-center justify-center text-[10px] font-mono',
  colorSwatchName: 'text-[11px] text-surface-600',
  colorPalette: 'mb-8',
  paletteName: 'm-0 mb-3 text-base font-semibold text-surface-800 capitalize',
  paletteGrid: 'flex flex-wrap gap-2',
  section: 'mb-12',
  sectionTitle: 'm-0 mb-2 text-xl font-semibold text-surface-900',
  sectionDesc: 'm-0 mb-6 text-sm text-surface-600 leading-relaxed',
  subsectionTitle: 'mt-6 mb-3 text-sm font-semibold text-surface-700',
  spacingGrid: 'flex flex-wrap gap-4 items-end',
  spacingItem: 'flex flex-col items-center gap-2',
  spacingBox: 'bg-brand-500 rounded-sm min-w-2 min-h-2',
  spacingLabel: 'flex flex-col items-center gap-0.5',
  spacingKey: 'text-xs font-semibold text-surface-800',
  spacingValue: 'text-[10px] text-surface-500 font-mono',
  typographyList: 'flex flex-col gap-3',
  typographyItem: 'flex items-baseline justify-between pb-3 border-b border-surface-200',
  typographySample: 'text-surface-900',
  typographyMeta: 'text-xs text-surface-500 font-mono',
  radiusGrid: 'flex flex-wrap gap-4',
  radiusItem: 'flex flex-col items-center gap-2',
  radiusBox: 'w-16 h-16 bg-brand-500',
  radiusLabel: 'text-[11px] text-surface-600 font-mono',
  shadowGrid: 'flex flex-wrap gap-6',
  shadowItem: 'flex flex-col items-center gap-3',
  shadowBox: 'w-20 h-20 bg-surface-50 rounded-md',
  shadowLabel: 'text-xs text-surface-600',
  button: 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 font-[inherit]',
  buttonIcon: 'inline-flex text-sm',
  spinner: 'animate-spin',
  buttonRow: 'flex flex-wrap gap-3 mb-4',
  inputWrapper: 'flex flex-col gap-1.5 w-full',
  inputLabel: 'text-sm font-medium text-surface-700',
  inputContainer: 'relative flex items-center',
  input: 'w-full px-3 py-2.5 text-sm text-surface-900 bg-surface-50 border border-surface-300 rounded-md outline-none transition-all duration-150 font-[inherit]',
  inputError: 'border-danger-500',
  inputAddon: 'absolute left-3 text-surface-500',
  inputErrorText: 'text-xs text-danger-600',
  inputHint: 'text-xs text-surface-500',
  inputGrid: 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6',
  badge: 'inline-flex items-center font-medium rounded-full uppercase tracking-wider',
  badgeRow: 'flex flex-wrap gap-2',
  card: 'bg-surface-50 rounded-lg border border-surface-200',
  cardHeader: 'mb-4',
  cardTitle: 'm-0 mb-1 text-base font-semibold text-surface-900',
  cardSubtitle: 'm-0 text-sm text-surface-600',
  cardContent: 'text-sm text-surface-700 leading-relaxed',
  cardFooter: 'mt-4 pt-4 border-t border-surface-200',
  cardFooterActions: 'flex justify-end gap-2',
  cardGrid: 'grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6',
  alert: 'flex items-start gap-3 p-4 rounded-lg border',
  alertIcon: 'text-lg shrink-0',
  alertContent: 'flex-1 text-sm leading-normal',
  alertTitle: 'block mb-1',
  alertClose: 'p-1 text-sm text-surface-500 bg-transparent border-none rounded cursor-pointer',
  alertStack: 'flex flex-col gap-3',
  viewer: 'max-w-[1200px] mx-auto p-8 font-sans',
  viewerHeader: 'mb-8 text-center',
  viewerTitle: 'm-0 mb-2 text-[32px] font-bold text-surface-900',
  viewerDesc: 'm-0 text-base text-surface-600',
  viewerNav: 'flex gap-2 mb-8 p-1 bg-surface-100 rounded-lg',
  navButton: 'flex-1 px-4 py-2.5 text-sm font-medium text-surface-600 bg-transparent border-none rounded-md cursor-pointer transition-all duration-150',
  navButtonActive: 'text-surface-900 bg-surface-50 shadow-sm',
  viewerContent: 'min-h-[400px]',
};

// ============================================================================
// Export
// ============================================================================

export default DesignSystemViewer;
