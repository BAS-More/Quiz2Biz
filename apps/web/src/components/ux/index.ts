/**
 * UX Enhancement Components
 *
 * Nielsen Heuristic compliant UI components for:
 * - User Control & Freedom (drafts, confirmations, undo)
 * - Error Prevention & Recovery
 * - Help & Documentation
 * - Navigation & Accessibility
 */

// ============================================================================
// Sprint 31: User Control & Error Recovery
// ============================================================================

// Draft Autosave System
export {
  DraftBanner,
  AutosaveIndicator,
  type DraftBannerProps,
  type AutosaveIndicatorProps,
} from './DraftBanner';

export {
  useDraftAutosave,
  formatTimeSinceSave,
  isDraftRecoverable,
  type DraftData,
  type AutosaveStatus,
  type UseDraftAutosaveOptions,
  type UseDraftAutosaveReturn,
} from '../../hooks/useDraftAutosave';

// Confirmation Dialogs
export {
  ConfirmationDialog,
  useConfirmation,
  confirmationPresets,
  type ConfirmationDialogProps,
  type ConfirmationVariant,
  type UseConfirmationOptions,
} from './ConfirmationDialog';

// Error Code System
export {
  ErrorDisplay,
  getErrorCode,
  parseApiError,
  useAutoRetry,
  ERROR_CODES,
  type ErrorCode,
  type ErrorCategory,
  type RecoveryAction,
  type ErrorDisplayProps,
  type UseAutoRetryOptions,
} from './ErrorCodeSystem';

// ============================================================================
// Sprint 32: Help System & Navigation
// ============================================================================

// Contextual Tooltips
export {
  Tooltip,
  TooltipProvider,
  useTooltipSettings,
  useTooltipAccessibility,
  InfoTooltip,
  DimensionTooltip,
  MetricTooltip,
  TOOLTIP_CONTENT,
  type TooltipProps,
  type TooltipPlacement,
  type TooltipTheme,
} from './Tooltips';

// First-Time Onboarding
export {
  OnboardingProvider,
  useOnboarding,
  TourTrigger,
  TourButton,
  TourList,
  ONBOARDING_TOURS,
  type OnboardingStep,
  type OnboardingTour,
  type OnboardingState,
} from './Onboarding';

// Breadcrumb Navigation
export {
  Breadcrumbs,
  BreadcrumbProvider,
  useBreadcrumbs,
  useSetBreadcrumbs,
  useRouteBreadcrumbs,
  PageBreadcrumbs,
  StandaloneBreadcrumbs,
  DEFAULT_ROUTE_MAPPINGS,
  type BreadcrumbItem,
  type BreadcrumbConfig,
  type BreadcrumbsProps,
  type RouteMapping,
} from './Breadcrumbs';

// Keyboard Shortcuts
export {
  KeyboardShortcutsProvider,
  useKeyboardShortcuts,
  useShortcut,
  ShortcutHelpButton,
  DEFAULT_SHORTCUTS,
  SHORTCUT_CATEGORIES,
  type KeyboardShortcut,
  type ShortcutCategory,
  type ShortcutCategoryInfo,
} from './KeyboardShortcuts';

// Recently Answered Indicator
export {
  RecentlyAnsweredProvider,
  useRecentlyAnswered,
  useMarkAnswered,
  RecentBadge,
  QuestionNavItem,
  RecentActivitySummary,
  RecentAnswersTimeline,
  RecentHighlight,
  formatRelativeTime,
  isRecent,
  isVeryRecent,
  type AnsweredQuestion,
  type RecentlyAnsweredConfig,
} from './RecentlyAnswered';

// Blur Validation
export {
  useBlurValidation,
  validationRules,
  validateField,
  FormValidationProvider,
  useFormValidation,
  ValidatedInput,
  ValidatedTextarea,
  FormErrorSummary,
  type ValidationRule,
  type FieldState,
  type FormFieldConfig,
} from './BlurValidation';

// ============================================================================
// Sprint 33: UX Polish & Enhancements
// ============================================================================

// Upload Progress Indicators
export {
  useUploadProgress,
  ProgressBar,
  UploadItem,
  UploadSummary,
  UploadList,
  formatSpeed,
  formatETA,
  type UploadFile,
  type UploadProgressOptions,
  type UseUploadProgressReturn,
} from './UploadProgress';

// Network Status Indicator
export {
  NetworkStatusProvider,
  useNetworkStatus,
  useTrackedFetch,
  NetworkBanner,
  NetworkIndicator,
  type NetworkStatus,
  type NetworkInfo,
  type PendingRequest,
} from './NetworkStatus';

// Navigation Guards
export {
  NavigationGuardProvider,
  useNavigationGuard,
  useDirtyForm,
  NavigationPrompt,
  UnsavedChangesDialog,
  GuardedLink,
  GuardedForm,
  type NavigationGuardConfig,
  type DirtyFormState,
} from './NavigationGuards';

// File Type Preview & Validation
export {
  FILE_TYPES,
  validateFile,
  validateFiles,
  useFilePreview,
  FilePreviewItem,
  ValidatedDropzone,
  type FileTypeConfig,
  type ValidationResult,
  type ValidationError,
  type FilePreview,
} from './FileTypePreview';

// Bulk File Operations
export {
  BulkFileProvider,
  useBulkFiles,
  SelectAllCheckbox,
  BulkActionBar,
  FileItem,
  FileGrid,
  MultiFileDropzone,
  BulkFileManager,
  type BulkFile,
  type BulkOperationResult,
  type BulkFileContextValue,
} from './BulkFileOperations';

// Design System Documentation
export {
  ThemeProvider,
  useTheme,
  DesignSystemViewer,
  ColorSwatch,
  ColorPaletteDisplay,
  SpacingScale,
  TypographyScale,
  BorderRadiusScale,
  ShadowScale,
  Button,
  ButtonShowcase,
  Input,
  InputShowcase,
  Badge,
  BadgeShowcase,
  Card,
  CardShowcase,
  Alert,
  AlertShowcase,
  SPACING_SCALE,
  COLOR_PALETTE,
  TYPOGRAPHY,
  BORDER_RADIUS,
  SHADOWS,
  BREAKPOINTS,
  TRANSITIONS,
  Z_INDEX,
} from './DesignSystem';

// Nielsen Score Verification
export {
  NielsenScoreViewer,
  calculateNielsenScore,
  ScoreBadge,
  StatusBadge,
  HeuristicCard,
  NIELSEN_HEURISTICS,
  type NielsenHeuristic,
  type HeuristicCheck,
  type NielsenScoreResult,
} from './NielsenScore';
