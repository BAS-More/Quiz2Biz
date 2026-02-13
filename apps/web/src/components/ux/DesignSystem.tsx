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
  <div style={styles.colorSwatch}>
    <div
      style={{
        ...styles.colorSwatchBox,
        backgroundColor: color,
        color: textColor,
      }}
    >
      {color}
    </div>
    <span style={styles.colorSwatchName}>{name}</span>
  </div>
);

export interface ColorPaletteDisplayProps {
  name: string;
  colors: Record<string | number, string>;
}

export const ColorPaletteDisplay: React.FC<ColorPaletteDisplayProps> = ({ name, colors }) => (
  <div style={styles.colorPalette}>
    <h4 style={styles.paletteName}>{name}</h4>
    <div style={styles.paletteGrid}>
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
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>Spacing Scale</h3>
    <p style={styles.sectionDesc}>
      Consistent spacing using a 4px base unit. Use these values for margins, padding, and gaps.
    </p>
    <div style={styles.spacingGrid}>
      {Object.entries(SPACING_SCALE).map(([key, value]) => (
        <div key={key} style={styles.spacingItem}>
          <div
            style={{
              ...styles.spacingBox,
              width: value,
              height: value,
            }}
          />
          <div style={styles.spacingLabel}>
            <span style={styles.spacingKey}>{key}</span>
            <span style={styles.spacingValue}>{value}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const TypographyScale: React.FC = () => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>Typography</h3>
    <p style={styles.sectionDesc}>
      Consistent font sizes and weights for readable, accessible text.
    </p>

    <h4 style={styles.subsectionTitle}>Font Sizes</h4>
    <div style={styles.typographyList}>
      {Object.entries(TYPOGRAPHY.fontSize).map(([key, value]) => (
        <div key={key} style={styles.typographyItem}>
          <span style={{ ...styles.typographySample, fontSize: value }}>The quick brown fox</span>
          <span style={styles.typographyMeta}>
            {key}: {value}
          </span>
        </div>
      ))}
    </div>

    <h4 style={styles.subsectionTitle}>Font Weights</h4>
    <div style={styles.typographyList}>
      {Object.entries(TYPOGRAPHY.fontWeight).map(([key, value]) => (
        <div key={key} style={styles.typographyItem}>
          <span style={{ ...styles.typographySample, fontWeight: value }}>The quick brown fox</span>
          <span style={styles.typographyMeta}>
            {key}: {value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const BorderRadiusScale: React.FC = () => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>Border Radius</h3>
    <div style={styles.radiusGrid}>
      {Object.entries(BORDER_RADIUS).map(([key, value]) => (
        <div key={key} style={styles.radiusItem}>
          <div
            style={{
              ...styles.radiusBox,
              borderRadius: value,
            }}
          />
          <span style={styles.radiusLabel}>
            {key}: {value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const ShadowScale: React.FC = () => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>Shadows</h3>
    <div style={styles.shadowGrid}>
      {Object.entries(SHADOWS).map(([key, value]) => (
        <div key={key} style={styles.shadowItem}>
          <div
            style={{
              ...styles.shadowBox,
              boxShadow: value,
            }}
          />
          <span style={styles.shadowLabel}>{key}</span>
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
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: COLOR_PALETTE.primary[600],
      color: '#FFFFFF',
      border: 'none',
    },
    secondary: {
      backgroundColor: '#FFFFFF',
      color: COLOR_PALETTE.neutral[700],
      border: `1px solid ${COLOR_PALETTE.neutral[300]}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: COLOR_PALETTE.neutral[700],
      border: 'none',
    },
    danger: {
      backgroundColor: COLOR_PALETTE.error[600],
      color: '#FFFFFF',
      border: 'none',
    },
    success: {
      backgroundColor: COLOR_PALETTE.success[600],
      color: '#FFFFFF',
      border: 'none',
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: '6px 12px',
      fontSize: TYPOGRAPHY.fontSize.sm,
      borderRadius: BORDER_RADIUS.md,
    },
    md: {
      padding: '8px 16px',
      fontSize: TYPOGRAPHY.fontSize.base,
      borderRadius: BORDER_RADIUS.md,
    },
    lg: {
      padding: '12px 24px',
      fontSize: TYPOGRAPHY.fontSize.lg,
      borderRadius: BORDER_RADIUS.lg,
    },
  };

  return (
    <button
      style={{
        ...styles.button,
        ...variantStyles[variant],
        ...sizeStyles[size],
        opacity: disabled || isLoading ? 0.6 : 1,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        ...style,
      }}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span style={styles.spinner}>⏳</span>}
      {leftIcon && !isLoading && <span style={styles.buttonIcon}>{leftIcon}</span>}
      {children}
      {rightIcon && <span style={styles.buttonIcon}>{rightIcon}</span>}
    </button>
  );
};

export const ButtonShowcase: React.FC = () => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>Buttons</h3>

    <h4 style={styles.subsectionTitle}>Variants</h4>
    <div style={styles.buttonRow}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="success">Success</Button>
    </div>

    <h4 style={styles.subsectionTitle}>Sizes</h4>
    <div style={styles.buttonRow}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>

    <h4 style={styles.subsectionTitle}>States</h4>
    <div style={styles.buttonRow}>
      <Button>Normal</Button>
      <Button disabled>Disabled</Button>
      <Button isLoading>Loading</Button>
    </div>

    <h4 style={styles.subsectionTitle}>With Icons</h4>
    <div style={styles.buttonRow}>
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
    <div style={styles.inputWrapper}>
      {label && (
        <label htmlFor={inputId} style={styles.inputLabel}>
          {label}
        </label>
      )}
      <div style={styles.inputContainer}>
        {leftAddon && <span style={styles.inputAddon}>{leftAddon}</span>}
        <input
          id={inputId}
          style={{
            ...styles.input,
            ...(error ? styles.inputError : {}),
            ...(leftAddon ? { paddingLeft: '40px' } : {}),
            ...(rightAddon ? { paddingRight: '40px' } : {}),
            ...style,
          }}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {rightAddon && (
          <span style={{ ...styles.inputAddon, right: '12px', left: 'auto' }}>{rightAddon}</span>
        )}
      </div>
      {error && (
        <span id={`${inputId}-error`} style={styles.inputErrorText} role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${inputId}-hint`} style={styles.inputHint}>
          {hint}
        </span>
      )}
    </div>
  );
};

export const InputShowcase: React.FC = () => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>Inputs</h3>

    <div style={styles.inputGrid}>
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
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: COLOR_PALETTE.neutral[100],
      color: COLOR_PALETTE.neutral[700],
    },
    primary: {
      backgroundColor: COLOR_PALETTE.primary[100],
      color: COLOR_PALETTE.primary[700],
    },
    success: {
      backgroundColor: COLOR_PALETTE.success[100],
      color: COLOR_PALETTE.success[700],
    },
    warning: {
      backgroundColor: COLOR_PALETTE.warning[100],
      color: COLOR_PALETTE.warning[700],
    },
    error: {
      backgroundColor: COLOR_PALETTE.error[100],
      color: COLOR_PALETTE.error[700],
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: '2px 6px',
      fontSize: '11px',
    },
    md: {
      padding: '4px 8px',
      fontSize: '12px',
    },
  };

  return (
    <span
      style={{
        ...styles.badge,
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
    >
      {children}
    </span>
  );
};

export const BadgeShowcase: React.FC = () => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>Badges</h3>
    <div style={styles.badgeRow}>
      <Badge>Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
    </div>
    <div style={{ ...styles.badgeRow, marginTop: '12px' }}>
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
    className={`design-card ${className}`}
    style={{
      ...styles.card,
      padding: SPACING_SCALE[padding],
      boxShadow: SHADOWS[shadow],
    }}
  >
    {(title || subtitle) && (
      <div style={styles.cardHeader}>
        {title && <h4 style={styles.cardTitle}>{title}</h4>}
        {subtitle && <p style={styles.cardSubtitle}>{subtitle}</p>}
      </div>
    )}
    <div style={styles.cardContent}>{children}</div>
    {footer && <div style={styles.cardFooter}>{footer}</div>}
  </div>
);

export const CardShowcase: React.FC = () => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>Cards</h3>
    <div style={styles.cardGrid}>
      <Card title="Basic Card" subtitle="With title and subtitle">
        <p>Card content goes here. Cards are versatile containers for related content.</p>
      </Card>
      <Card
        title="Card with Footer"
        footer={
          <div style={styles.cardFooterActions}>
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
  const variantStyles: Record<string, { bg: string; border: string; icon: string }> = {
    info: {
      bg: COLOR_PALETTE.primary[50],
      border: COLOR_PALETTE.primary[200],
      icon: 'ℹ️',
    },
    success: {
      bg: COLOR_PALETTE.success[50],
      border: COLOR_PALETTE.success[200],
      icon: '✅',
    },
    warning: {
      bg: COLOR_PALETTE.warning[50],
      border: COLOR_PALETTE.warning[200],
      icon: '⚠️',
    },
    error: {
      bg: COLOR_PALETTE.error[50],
      border: COLOR_PALETTE.error[200],
      icon: '❌',
    },
  };

  const { bg, border, icon } = variantStyles[variant];

  return (
    <div
      style={{
        ...styles.alert,
        backgroundColor: bg,
        borderColor: border,
      }}
      role="alert"
    >
      <span style={styles.alertIcon}>{icon}</span>
      <div style={styles.alertContent}>
        {title && <strong style={styles.alertTitle}>{title}</strong>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} style={styles.alertClose} aria-label="Dismiss alert">
          ✕
        </button>
      )}
    </div>
  );
};

export const AlertShowcase: React.FC = () => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>Alerts</h3>
    <div style={styles.alertStack}>
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
    <div style={styles.viewer}>
      <header style={styles.viewerHeader}>
        <h1 style={styles.viewerTitle}>Design System</h1>
        <p style={styles.viewerDesc}>Quiz2Biz unified design tokens and component library</p>
      </header>

      <nav style={styles.viewerNav}>
        {sections.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            style={{
              ...styles.navButton,
              ...(activeSection === id ? styles.navButtonActive : {}),
            }}
            aria-current={activeSection === id ? 'page' : undefined}
          >
            {label}
          </button>
        ))}
      </nav>

      <main style={styles.viewerContent}>
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

const styles: Record<string, React.CSSProperties> = {
  // Color Swatch
  colorSwatch: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  colorSwatchBox: {
    width: '80px',
    height: '48px',
    borderRadius: BORDER_RADIUS.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },
  colorSwatchName: {
    fontSize: '11px',
    color: COLOR_PALETTE.neutral[600],
  },

  // Color Palette
  colorPalette: {
    marginBottom: '32px',
  },
  paletteName: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: COLOR_PALETTE.neutral[800],
    textTransform: 'capitalize',
  },
  paletteGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },

  // Section
  section: {
    marginBottom: '48px',
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: 600,
    color: COLOR_PALETTE.neutral[900],
  },
  sectionDesc: {
    margin: '0 0 24px 0',
    fontSize: '14px',
    color: COLOR_PALETTE.neutral[600],
    lineHeight: 1.6,
  },
  subsectionTitle: {
    margin: '24px 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: COLOR_PALETTE.neutral[700],
  },

  // Spacing
  spacingGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'flex-end',
  },
  spacingItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  spacingBox: {
    backgroundColor: COLOR_PALETTE.primary[500],
    borderRadius: '2px',
    minWidth: '8px',
    minHeight: '8px',
  },
  spacingLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  spacingKey: {
    fontSize: '12px',
    fontWeight: 600,
    color: COLOR_PALETTE.neutral[800],
  },
  spacingValue: {
    fontSize: '10px',
    color: COLOR_PALETTE.neutral[500],
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },

  // Typography
  typographyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  typographyItem: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: '12px',
    borderBottom: `1px solid ${COLOR_PALETTE.neutral[200]}`,
  },
  typographySample: {
    color: COLOR_PALETTE.neutral[900],
  },
  typographyMeta: {
    fontSize: '12px',
    color: COLOR_PALETTE.neutral[500],
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },

  // Border Radius
  radiusGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
  },
  radiusItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  radiusBox: {
    width: '64px',
    height: '64px',
    backgroundColor: COLOR_PALETTE.primary[500],
  },
  radiusLabel: {
    fontSize: '11px',
    color: COLOR_PALETTE.neutral[600],
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },

  // Shadows
  shadowGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
  },
  shadowItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  shadowBox: {
    width: '80px',
    height: '80px',
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.md,
  },
  shadowLabel: {
    fontSize: '12px',
    color: COLOR_PALETTE.neutral[600],
  },

  // Button
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 500,
    transition: TRANSITIONS.fast,
    fontFamily: 'inherit',
  },
  buttonIcon: {
    display: 'inline-flex',
    fontSize: '14px',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '16px',
  },

  // Input
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
  },
  inputLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: COLOR_PALETTE.neutral[700],
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    color: COLOR_PALETTE.neutral[900],
    backgroundColor: '#FFFFFF',
    border: `1px solid ${COLOR_PALETTE.neutral[300]}`,
    borderRadius: BORDER_RADIUS.md,
    outline: 'none',
    transition: TRANSITIONS.fast,
    fontFamily: 'inherit',
  },
  inputError: {
    borderColor: COLOR_PALETTE.error[500],
  },
  inputAddon: {
    position: 'absolute',
    left: '12px',
    color: COLOR_PALETTE.neutral[500],
  },
  inputErrorText: {
    fontSize: '12px',
    color: COLOR_PALETTE.error[600],
  },
  inputHint: {
    fontSize: '12px',
    color: COLOR_PALETTE.neutral[500],
  },
  inputGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },

  // Badge
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: 500,
    borderRadius: BORDER_RADIUS.full,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    border: `1px solid ${COLOR_PALETTE.neutral[200]}`,
  },
  cardHeader: {
    marginBottom: '16px',
  },
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: COLOR_PALETTE.neutral[900],
  },
  cardSubtitle: {
    margin: 0,
    fontSize: '14px',
    color: COLOR_PALETTE.neutral[600],
  },
  cardContent: {
    fontSize: '14px',
    color: COLOR_PALETTE.neutral[700],
    lineHeight: 1.6,
  },
  cardFooter: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: `1px solid ${COLOR_PALETTE.neutral[200]}`,
  },
  cardFooterActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  },

  // Alert
  alert: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid',
  },
  alertIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  alertContent: {
    flex: 1,
    fontSize: '14px',
    lineHeight: 1.5,
  },
  alertTitle: {
    display: 'block',
    marginBottom: '4px',
  },
  alertClose: {
    padding: '4px',
    fontSize: '14px',
    color: COLOR_PALETTE.neutral[500],
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
  },
  alertStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  // Viewer
  viewer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px',
    fontFamily: TYPOGRAPHY.fontFamily.sans,
  },
  viewerHeader: {
    marginBottom: '32px',
    textAlign: 'center',
  },
  viewerTitle: {
    margin: '0 0 8px 0',
    fontSize: '32px',
    fontWeight: 700,
    color: COLOR_PALETTE.neutral[900],
  },
  viewerDesc: {
    margin: 0,
    fontSize: '16px',
    color: COLOR_PALETTE.neutral[600],
  },
  viewerNav: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
    padding: '4px',
    backgroundColor: COLOR_PALETTE.neutral[100],
    borderRadius: BORDER_RADIUS.lg,
  },
  navButton: {
    flex: 1,
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: COLOR_PALETTE.neutral[600],
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: TRANSITIONS.fast,
  },
  navButtonActive: {
    color: COLOR_PALETTE.neutral[900],
    backgroundColor: '#FFFFFF',
    boxShadow: SHADOWS.sm,
  },
  viewerContent: {
    minHeight: '400px',
  },
};

// ============================================================================
// Export
// ============================================================================

export default DesignSystemViewer;
