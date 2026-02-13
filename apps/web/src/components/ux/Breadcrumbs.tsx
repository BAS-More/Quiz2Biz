/**
 * Breadcrumb Navigation Component
 *
 * Shows hierarchical navigation path.
 * Example: Dashboard > Questionnaires > Security Assessment
 *
 * Nielsen Heuristic #3: User Control and Freedom
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Navigation path/URL */
  href?: string;
  /** Icon (emoji or component) */
  icon?: React.ReactNode;
  /** Click handler (alternative to href) */
  onClick?: () => void;
  /** Whether this is the current/active page */
  isCurrent?: boolean;
  /** Tooltip/title */
  title?: string;
}

export interface BreadcrumbConfig {
  /** Home item (first in breadcrumb) */
  homeItem?: BreadcrumbItem;
  /** Separator between items */
  separator?: React.ReactNode;
  /** Maximum items to show (truncate middle) */
  maxItems?: number;
  /** Custom class name */
  className?: string;
  /** ARIA label for navigation */
  ariaLabel?: string;
  /** Whether to show icons */
  showIcons?: boolean;
}

// ============================================================================
// Route to Breadcrumb Mapping
// ============================================================================

export interface RouteMapping {
  pattern: RegExp;
  breadcrumbs: BreadcrumbItem[] | ((params: Record<string, string>) => BreadcrumbItem[]);
}

export const DEFAULT_ROUTE_MAPPINGS: RouteMapping[] = [
  {
    pattern: /^\/$/,
    breadcrumbs: [{ label: 'Home', href: '/', icon: '🏠', isCurrent: true }],
  },
  {
    pattern: /^\/dashboard$/,
    breadcrumbs: [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: 'Dashboard', href: '/dashboard', icon: '📊', isCurrent: true },
    ],
  },
  {
    pattern: /^\/questionnaires$/,
    breadcrumbs: [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: 'Dashboard', href: '/dashboard', icon: '📊' },
      { label: 'Questionnaires', href: '/questionnaires', icon: '📝', isCurrent: true },
    ],
  },
  {
    pattern: /^\/questionnaires\/([^/]+)$/,
    breadcrumbs: (params) => [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: 'Dashboard', href: '/dashboard', icon: '📊' },
      { label: 'Questionnaires', href: '/questionnaires', icon: '📝' },
      { label: params.name || 'Assessment', href: params.href, icon: '📋', isCurrent: true },
    ],
  },
  {
    pattern: /^\/questionnaires\/([^/]+)\/question\/([^/]+)$/,
    breadcrumbs: (params) => [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: 'Dashboard', href: '/dashboard', icon: '📊' },
      { label: 'Questionnaires', href: '/questionnaires', icon: '📝' },
      {
        label: params.assessmentName || 'Assessment',
        href: `/questionnaires/${params.assessmentId}`,
        icon: '📋',
      },
      { label: `Question ${params.questionNumber || ''}`, isCurrent: true, icon: '❓' },
    ],
  },
  {
    pattern: /^\/settings$/,
    breadcrumbs: [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: 'Settings', href: '/settings', icon: '⚙️', isCurrent: true },
    ],
  },
  {
    pattern: /^\/settings\/([^/]+)$/,
    breadcrumbs: (params) => [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: 'Settings', href: '/settings', icon: '⚙️' },
      { label: params.section || 'Section', isCurrent: true },
    ],
  },
  {
    pattern: /^\/billing$/,
    breadcrumbs: [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: 'Settings', href: '/settings', icon: '⚙️' },
      { label: 'Billing', href: '/billing', icon: '💳', isCurrent: true },
    ],
  },
  {
    pattern: /^\/help$/,
    breadcrumbs: [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: 'Help Center', href: '/help', icon: '❓', isCurrent: true },
    ],
  },
  {
    pattern: /^\/reports$/,
    breadcrumbs: [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: 'Dashboard', href: '/dashboard', icon: '📊' },
      { label: 'Reports', href: '/reports', icon: '📈', isCurrent: true },
    ],
  },
  {
    pattern: /^\/reports\/([^/]+)$/,
    breadcrumbs: (params) => [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: 'Dashboard', href: '/dashboard', icon: '📊' },
      { label: 'Reports', href: '/reports', icon: '📈' },
      { label: params.reportName || 'Report', isCurrent: true, icon: '📄' },
    ],
  },
  {
    pattern: /^\/admin$/,
    breadcrumbs: [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: 'Admin', href: '/admin', icon: '🔐', isCurrent: true },
    ],
  },
  {
    pattern: /^\/admin\/([^/]+)$/,
    breadcrumbs: (params) => [
      { label: 'Home', href: '/', icon: '🏠' },
      { label: 'Admin', href: '/admin', icon: '🔐' },
      { label: params.section || 'Section', isCurrent: true },
    ],
  },
];

// ============================================================================
// Context
// ============================================================================

interface BreadcrumbContextValue {
  items: BreadcrumbItem[];
  setItems: React.Dispatch<React.SetStateAction<BreadcrumbItem[]>>;
  config: BreadcrumbConfig;
  routeMappings: RouteMapping[];
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export const useBreadcrumbs = () => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumbs must be used within BreadcrumbProvider');
  }
  return context;
};

// ============================================================================
// Provider
// ============================================================================

interface BreadcrumbProviderProps {
  children: React.ReactNode;
  config?: BreadcrumbConfig;
  routeMappings?: RouteMapping[];
  initialItems?: BreadcrumbItem[];
}

export const BreadcrumbProvider: React.FC<BreadcrumbProviderProps> = ({
  children,
  config = {},
  routeMappings = DEFAULT_ROUTE_MAPPINGS,
  initialItems = [],
}) => {
  const [items, setItems] = React.useState<BreadcrumbItem[]>(initialItems);

  const fullConfig: BreadcrumbConfig = {
    homeItem: { label: 'Home', href: '/', icon: '🏠' },
    separator: '/',
    maxItems: 5,
    ariaLabel: 'Breadcrumb navigation',
    showIcons: true,
    ...config,
  };

  return (
    <BreadcrumbContext.Provider
      value={{
        items,
        setItems,
        config: fullConfig,
        routeMappings,
      }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
};

// ============================================================================
// Breadcrumb Component
// ============================================================================

export interface BreadcrumbsProps {
  /** Override items from context */
  items?: BreadcrumbItem[];
  /** Override config from context */
  config?: Partial<BreadcrumbConfig>;
  /** Custom class name */
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items: propItems,
  config: propConfig,
  className = '',
}) => {
  const context = useContext(BreadcrumbContext);

  const items = propItems || context?.items || [];
  const config: BreadcrumbConfig = {
    ...(context?.config || {}),
    ...propConfig,
  };

  const {
    separator = '/',
    maxItems = 5,
    ariaLabel = 'Breadcrumb navigation',
    showIcons = true,
  } = config;

  // Truncate if needed
  const displayItems = useMemo(() => {
    if (items.length <= maxItems) {
      return items;
    }

    const first = items.slice(0, 1);
    const last = items.slice(-2);
    return [...first, { label: '...', title: `${items.length - 3} more items` }, ...last];
  }, [items, maxItems]);

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <nav aria-label={ariaLabel} className={`breadcrumbs ${className}`}>
      <ol className="breadcrumbs__list" itemScope itemType="https://schema.org/BreadcrumbList">
        {displayItems.map((item, index) => (
          <li
            key={index}
            className={`breadcrumbs__item ${item.isCurrent ? 'breadcrumbs__item--current' : ''}`}
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            {index > 0 && (
              <span className="breadcrumbs__separator" aria-hidden="true">
                {separator}
              </span>
            )}

            <BreadcrumbLink item={item} showIcon={showIcons} position={index + 1} />
          </li>
        ))}
      </ol>

      <style>{`
        .breadcrumbs {
          padding: 12px 0;
        }

        .breadcrumbs__list {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
          list-style: none;
          margin: 0;
          padding: 0;
          font-size: 14px;
        }

        .breadcrumbs__item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .breadcrumbs__separator {
          color: #a0aec0;
          margin: 0 4px;
          user-select: none;
        }

        .breadcrumbs__link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #4a5568;
          text-decoration: none;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .breadcrumbs__link:hover {
          color: #2b6cb0;
          background: #ebf8ff;
        }

        .breadcrumbs__link:focus {
          outline: 2px solid #3182ce;
          outline-offset: 2px;
        }

        .breadcrumbs__link--current {
          color: #1a202c;
          font-weight: 500;
          pointer-events: none;
        }

        .breadcrumbs__link--ellipsis {
          color: #a0aec0;
          cursor: default;
        }

        .breadcrumbs__icon {
          font-size: 14px;
          line-height: 1;
        }

        .breadcrumbs__label {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .breadcrumbs__list {
            font-size: 13px;
          }

          .breadcrumbs__label {
            max-width: 100px;
          }

          .breadcrumbs__item:not(:last-child):not(:first-child) .breadcrumbs__label {
            display: none;
          }

          .breadcrumbs__item:not(:last-child):not(:first-child) .breadcrumbs__icon {
            margin: 0;
          }
        }
      `}</style>
    </nav>
  );
};

// ============================================================================
// Breadcrumb Link Sub-component
// ============================================================================

interface BreadcrumbLinkProps {
  item: BreadcrumbItem;
  showIcon: boolean;
  position: number;
}

const BreadcrumbLink: React.FC<BreadcrumbLinkProps> = ({ item, showIcon, position }) => {
  const isEllipsis = item.label === '...';
  const isCurrent = item.isCurrent;

  const content = (
    <>
      {showIcon && item.icon && (
        <span className="breadcrumbs__icon" aria-hidden="true">
          {item.icon}
        </span>
      )}
      <span className="breadcrumbs__label" itemProp="name">
        {item.label}
      </span>
    </>
  );

  const className = `breadcrumbs__link ${
    isCurrent ? 'breadcrumbs__link--current' : ''
  } ${isEllipsis ? 'breadcrumbs__link--ellipsis' : ''}`;

  // Schema.org position
  const meta = <meta itemProp="position" content={String(position)} />;

  if (isEllipsis) {
    return (
      <span className={className} title={item.title}>
        {content}
      </span>
    );
  }

  if (isCurrent) {
    return (
      <span className={className} aria-current="page" title={item.title}>
        {content}
        {meta}
      </span>
    );
  }

  if (item.onClick) {
    return (
      <button type="button" className={className} onClick={item.onClick} title={item.title}>
        {content}
        {meta}
      </button>
    );
  }

  if (item.href) {
    return (
      <a href={item.href} className={className} title={item.title} itemProp="item">
        {content}
        {meta}
      </a>
    );
  }

  return (
    <span className={className} title={item.title}>
      {content}
      {meta}
    </span>
  );
};

// ============================================================================
// Hook for setting breadcrumbs
// ============================================================================

export function useSetBreadcrumbs() {
  const { setItems } = useBreadcrumbs();

  const setBreadcrumbs = useCallback(
    (items: BreadcrumbItem[]) => {
      setItems(items);
    },
    [setItems],
  );

  const addBreadcrumb = useCallback(
    (item: BreadcrumbItem) => {
      setItems((prev: BreadcrumbItem[]) => [...prev, item]);
    },
    [setItems],
  );

  const clearBreadcrumbs = useCallback(() => {
    setItems([]);
  }, [setItems]);

  return { setBreadcrumbs, addBreadcrumb, clearBreadcrumbs };
}

// ============================================================================
// Hook for route-based breadcrumbs
// ============================================================================

interface UseRouteBreaderumbsOptions {
  pathname: string;
  params?: Record<string, string>;
}

export function useRouteBreadcrumbs({ pathname, params = {} }: UseRouteBreaderumbsOptions) {
  const { routeMappings, setItems } = useBreadcrumbs();

  React.useEffect(() => {
    for (const mapping of routeMappings) {
      const match = pathname.match(mapping.pattern);
      if (match) {
        const breadcrumbs =
          typeof mapping.breadcrumbs === 'function'
            ? mapping.breadcrumbs(params)
            : mapping.breadcrumbs;
        setItems(breadcrumbs);
        return;
      }
    }
    // Default: just show home
    setItems([{ label: 'Home', href: '/', icon: '🏠' }]);
  }, [pathname, params, routeMappings, setItems]);
}

// ============================================================================
// Page-level component for easy integration
// ============================================================================

interface PageBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const PageBreadcrumbs: React.FC<PageBreadcrumbsProps> = ({ items, className }) => {
  // Ensure last item is marked as current
  const processedItems = items.map((item, index) => ({
    ...item,
    isCurrent: index === items.length - 1,
  }));

  return <Breadcrumbs items={processedItems} className={className} />;
};

// ============================================================================
// Standalone component (no provider needed)
// ============================================================================

interface StandaloneBreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showIcons?: boolean;
  maxItems?: number;
  className?: string;
}

export const StandaloneBreadcrumbs: React.FC<StandaloneBreadcrumbsProps> = ({
  items,
  separator = '/',
  showIcons = true,
  maxItems = 5,
  className = '',
}) => {
  return (
    <Breadcrumbs items={items} config={{ separator, showIcons, maxItems }} className={className} />
  );
};

export default Breadcrumbs;
