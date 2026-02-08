/**
 * Wireframes/Mockups Document Template
 * Category: BA
 *
 * This template defines the structure for generating Wireframes and Mockups
 * documents from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface WireframesMockupsData {
  overview: string;
  designSystem: {
    colors: ColorPalette;
    typography: TypographySystem;
    spacing: SpacingSystem;
    components: DesignComponent[];
  };
  pageLayouts: {
    dashboard: PageLayout;
    forms: PageLayout;
    lists: PageLayout;
    detailViews: PageLayout;
  };
  navigation: {
    siteMap: SiteMapNode[];
    menuStructure: MenuItem[];
    breadcrumbs: BreadcrumbPattern[];
  };
  responsiveDesign: {
    breakpoints: Breakpoint[];
    mobileLayout: ResponsiveLayout;
    tabletLayout: ResponsiveLayout;
  };
  interactiveElements: {
    buttons: InteractiveElement[];
    forms: FormElement[];
    modals: ModalElement[];
    notifications: NotificationElement[];
  };
  accessibility: {
    wcagRequirements: WCAGRequirement[];
    screenReaderSupport: ScreenReaderSpec[];
    keyboardNavigation: KeyboardSpec[];
  };
  appendices: {
    supportingDocuments: string[];
    designAssets: string;
    styleGuide: string;
  };
}

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  textPrimary: string;
  textSecondary: string;
}

interface TypographySystem {
  fontFamily: string;
  headingFont: string;
  bodyFont: string;
  sizes: { name: string; size: string; lineHeight: string; weight: string }[];
}

interface SpacingSystem {
  baseUnit: string;
  scale: { name: string; value: string }[];
  gridColumns: number;
  gutterWidth: string;
}

interface DesignComponent {
  id: string;
  name: string;
  description: string;
  variants: string[];
  states: string[];
  usage: string;
}

interface PageLayout {
  id: string;
  name: string;
  description: string;
  gridStructure: string;
  components: string[];
  wireframeRef: string;
  notes: string;
}

interface SiteMapNode {
  id: string;
  name: string;
  path: string;
  parentId: string;
  level: number;
  accessLevel: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  children: string[];
  visibility: string;
}

interface BreadcrumbPattern {
  page: string;
  pattern: string[];
  dynamic: boolean;
}

interface Breakpoint {
  name: string;
  minWidth: string;
  maxWidth: string;
  columns: number;
  gutterWidth: string;
}

interface ResponsiveLayout {
  navigation: string;
  contentWidth: string;
  stackBehavior: string;
  hiddenElements: string[];
  modifiedComponents: string[];
}

interface InteractiveElement {
  id: string;
  name: string;
  variants: string[];
  states: string[];
  sizes: string[];
  behavior: string;
}

interface FormElement {
  id: string;
  type: string;
  label: string;
  validation: string;
  placeholder: string;
  helpText: string;
  errorState: string;
}

interface ModalElement {
  id: string;
  name: string;
  triggerAction: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'FULLSCREEN';
  content: string;
  actions: string[];
  dismissBehavior: string;
}

interface NotificationElement {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';
  position: string;
  duration: string;
  dismissible: boolean;
  content: string;
}

interface WCAGRequirement {
  id: string;
  level: 'A' | 'AA' | 'AAA';
  criterion: string;
  description: string;
  implementation: string;
  status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';
}

interface ScreenReaderSpec {
  element: string;
  ariaLabel: string;
  ariaRole: string;
  ariaDescribedBy: string;
  tabOrder: number;
}

interface KeyboardSpec {
  action: string;
  keyBinding: string;
  context: string;
  description: string;
}

/**
 * Template configuration for Wireframes/Mockups
 */
export const WIREFRAMES_MOCKUPS_TEMPLATE = {
  slug: 'wireframes-mockups',
  name: 'Wireframes/Mockups',
  category: DocumentCategory.BA,
  description:
    'Wireframes and mockups document covering design system, page layouts, navigation, responsive design, interactive elements, and accessibility',
  estimatedPages: 15,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'designSystem.colors',
    'designSystem.typography',
    'pageLayouts.dashboard',
    'navigation.siteMap',
    'accessibility.wcagRequirements',
  ],

  /**
   * Section order for document generation
   */
  sections: [
    {
      id: 'document_control',
      title: 'Document Control',
      required: true,
    },
    {
      id: 'overview',
      title: 'Overview',
      required: true,
      contentPath: 'overview',
    },
    {
      id: 'design_system',
      title: 'Design System',
      required: true,
      subsections: [
        {
          id: 'colors',
          title: 'Color Palette',
          contentPath: 'designSystem.colors',
        },
        {
          id: 'typography',
          title: 'Typography',
          contentPath: 'designSystem.typography',
        },
        {
          id: 'spacing',
          title: 'Spacing & Grid',
          contentPath: 'designSystem.spacing',
        },
        {
          id: 'components',
          title: 'Component Library',
          contentPath: 'designSystem.components',
        },
      ],
    },
    {
      id: 'page_layouts',
      title: 'Page Layouts',
      required: true,
      subsections: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          contentPath: 'pageLayouts.dashboard',
        },
        {
          id: 'forms',
          title: 'Forms',
          contentPath: 'pageLayouts.forms',
        },
        {
          id: 'lists',
          title: 'Lists',
          contentPath: 'pageLayouts.lists',
        },
        {
          id: 'detail_views',
          title: 'Detail Views',
          contentPath: 'pageLayouts.detailViews',
        },
      ],
    },
    {
      id: 'navigation',
      title: 'Navigation',
      required: true,
      subsections: [
        {
          id: 'site_map',
          title: 'Site Map',
          contentPath: 'navigation.siteMap',
        },
        {
          id: 'menu_structure',
          title: 'Menu Structure',
          contentPath: 'navigation.menuStructure',
        },
        {
          id: 'breadcrumbs',
          title: 'Breadcrumbs',
          contentPath: 'navigation.breadcrumbs',
        },
      ],
    },
    {
      id: 'responsive_design',
      title: 'Responsive Design',
      required: true,
      subsections: [
        {
          id: 'breakpoints',
          title: 'Breakpoints',
          contentPath: 'responsiveDesign.breakpoints',
        },
        {
          id: 'mobile_layout',
          title: 'Mobile Layout',
          contentPath: 'responsiveDesign.mobileLayout',
        },
        {
          id: 'tablet_layout',
          title: 'Tablet Layout',
          contentPath: 'responsiveDesign.tabletLayout',
        },
      ],
    },
    {
      id: 'interactive_elements',
      title: 'Interactive Elements',
      required: true,
      subsections: [
        {
          id: 'buttons',
          title: 'Buttons',
          contentPath: 'interactiveElements.buttons',
        },
        {
          id: 'forms_elements',
          title: 'Form Elements',
          contentPath: 'interactiveElements.forms',
        },
        {
          id: 'modals',
          title: 'Modals & Dialogs',
          contentPath: 'interactiveElements.modals',
        },
        {
          id: 'notifications',
          title: 'Notifications',
          contentPath: 'interactiveElements.notifications',
        },
      ],
    },
    {
      id: 'accessibility',
      title: 'Accessibility',
      required: true,
      subsections: [
        {
          id: 'wcag_requirements',
          title: 'WCAG Requirements',
          contentPath: 'accessibility.wcagRequirements',
        },
        {
          id: 'screen_reader',
          title: 'Screen Reader Support',
          contentPath: 'accessibility.screenReaderSupport',
        },
        {
          id: 'keyboard',
          title: 'Keyboard Navigation',
          contentPath: 'accessibility.keyboardNavigation',
        },
      ],
    },
    {
      id: 'appendices',
      title: 'Appendices',
      required: false,
      subsections: [
        {
          id: 'supporting_documents',
          title: 'Supporting Documents',
          contentPath: 'appendices.supportingDocuments',
        },
        {
          id: 'design_assets',
          title: 'Design Assets',
          contentPath: 'appendices.designAssets',
        },
        {
          id: 'style_guide',
          title: 'Style Guide',
          contentPath: 'appendices.styleGuide',
        },
      ],
    },
  ],

  /**
   * Question to content field mappings (question slug -> content path)
   */
  questionMappings: {
    'brand-colors': 'designSystem.colors',
    'typography-choices': 'designSystem.typography',
    'spacing-system': 'designSystem.spacing',
    'component-library': 'designSystem.components',
    'dashboard-layout': 'pageLayouts.dashboard',
    'form-layouts': 'pageLayouts.forms',
    'list-layouts': 'pageLayouts.lists',
    'detail-view-layouts': 'pageLayouts.detailViews',
    'site-map': 'navigation.siteMap',
    'menu-structure': 'navigation.menuStructure',
    'breadcrumb-patterns': 'navigation.breadcrumbs',
    'responsive-breakpoints': 'responsiveDesign.breakpoints',
    'mobile-layout': 'responsiveDesign.mobileLayout',
    'tablet-layout': 'responsiveDesign.tabletLayout',
    'button-styles': 'interactiveElements.buttons',
    'form-elements': 'interactiveElements.forms',
    'modal-patterns': 'interactiveElements.modals',
    'notification-patterns': 'interactiveElements.notifications',
    'wcag-compliance': 'accessibility.wcagRequirements',
    'screen-reader-support': 'accessibility.screenReaderSupport',
    'keyboard-navigation': 'accessibility.keyboardNavigation',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'designSystem.spacing': '{"baseUnit": "8px", "scale": [], "gridColumns": 12, "gutterWidth": "16px"}',
    'responsiveDesign.breakpoints': '[{"name": "mobile", "minWidth": "0", "maxWidth": "767px", "columns": 4, "gutterWidth": "16px"}, {"name": "tablet", "minWidth": "768px", "maxWidth": "1023px", "columns": 8, "gutterWidth": "24px"}, {"name": "desktop", "minWidth": "1024px", "maxWidth": "", "columns": 12, "gutterWidth": "24px"}]',
    'appendices.designAssets': 'Design assets available in Figma project workspace',
    'appendices.styleGuide': 'Full style guide maintained alongside design system documentation',
  },
};
