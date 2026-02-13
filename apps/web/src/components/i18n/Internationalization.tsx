/**
 * Internationalization System
 *
 * Sprint 38: Internationalization & Accessibility++
 * Task ux38t1: i18n Setup - react-i18next, translation files, language switcher
 * Task ux38t2: Multi-Language Support - 5 languages (ES, FR, DE, JA, ZH)
 * Task ux38t3: Cultural Localization - Date/number/currency formats per locale
 * Task ux38t4: RTL Support - Arabic/Hebrew layout mirroring
 *
 * Features:
 * - React-i18next integration
 * - Dynamic language switching
 * - Locale-specific formatting
 * - RTL layout support
 * - Translation management
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'ar' | 'he';

export type TextDirection = 'ltr' | 'rtl';

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: TextDirection;
  dateFormat: string;
  timeFormat: string;
  numberFormat: Intl.NumberFormatOptions;
  currencyCode: string;
  firstDayOfWeek: 0 | 1 | 6; // Sunday = 0, Monday = 1, Saturday = 6
  flag: string;
}

export interface TranslationNamespace {
  common: Record<string, string>;
  auth: Record<string, string>;
  questionnaire: Record<string, string>;
  dashboard: Record<string, string>;
  billing: Record<string, string>;
  help: Record<string, string>;
  errors: Record<string, string>;
  validation: Record<string, string>;
}

export interface I18nState {
  locale: SupportedLocale;
  direction: TextDirection;
  translations: Map<SupportedLocale, Partial<TranslationNamespace>>;
  loadedNamespaces: Set<string>;
  isLoading: boolean;
  fallbackLocale: SupportedLocale;
}

type I18nAction =
  | { type: 'SET_LOCALE'; locale: SupportedLocale }
  | { type: 'SET_DIRECTION'; direction: TextDirection }
  | {
      type: 'LOAD_TRANSLATIONS';
      locale: SupportedLocale;
      namespace: string;
      translations: Record<string, string>;
    }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'LOAD_STATE'; state: Partial<I18nState> };

export interface I18nContextType extends I18nState {
  // Translation
  t: (key: string, params?: Record<string, string | number>) => string;
  changeLocale: (locale: SupportedLocale) => Promise<void>;

  // Formatting
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatRelativeTime: (date: Date) => string;

  // Locale info
  getLocaleConfig: (locale?: SupportedLocale) => LocaleConfig;
  getSupportedLocales: () => LocaleConfig[];
  isRTL: () => boolean;
}

// =============================================================================
// LOCALE CONFIGURATIONS
// =============================================================================

export const LOCALE_CONFIGS: Record<SupportedLocale, LocaleConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currencyCode: 'USD',
    firstDayOfWeek: 0,
    flag: '🇺🇸',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currencyCode: 'EUR',
    firstDayOfWeek: 1,
    flag: '🇪🇸',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currencyCode: 'EUR',
    firstDayOfWeek: 1,
    flag: '🇫🇷',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currencyCode: 'EUR',
    firstDayOfWeek: 1,
    flag: '🇩🇪',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 },
    currencyCode: 'JPY',
    firstDayOfWeek: 0,
    flag: '🇯🇵',
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currencyCode: 'CNY',
    firstDayOfWeek: 1,
    flag: '🇨🇳',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currencyCode: 'SAR',
    firstDayOfWeek: 6,
    flag: '🇸🇦',
  },
  he: {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    direction: 'rtl',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 },
    currencyCode: 'ILS',
    firstDayOfWeek: 0,
    flag: '🇮🇱',
  },
};

// =============================================================================
// DEFAULT TRANSLATIONS
// =============================================================================

const defaultTranslations: Record<SupportedLocale, Partial<TranslationNamespace>> = {
  en: {
    common: {
      'app.name': 'Quiz2Biz',
      'nav.dashboard': 'Dashboard',
      'nav.questionnaires': 'Questionnaires',
      'nav.documents': 'Documents',
      'nav.analytics': 'Analytics',
      'nav.settings': 'Settings',
      'nav.help': 'Help',
      'nav.logout': 'Logout',
      'button.save': 'Save',
      'button.cancel': 'Cancel',
      'button.submit': 'Submit',
      'button.next': 'Next',
      'button.previous': 'Previous',
      'button.delete': 'Delete',
      'button.edit': 'Edit',
      'button.close': 'Close',
      'label.loading': 'Loading...',
      'label.search': 'Search',
      'label.filter': 'Filter',
      'label.sort': 'Sort',
    },
    auth: {
      'auth.login': 'Login',
      'auth.register': 'Register',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.confirmPassword': 'Confirm Password',
      'auth.forgotPassword': 'Forgot Password?',
      'auth.resetPassword': 'Reset Password',
      'auth.loginWith': 'Login with {{provider}}',
      'auth.noAccount': "Don't have an account?",
      'auth.hasAccount': 'Already have an account?',
    },
    questionnaire: {
      'questionnaire.title': 'Questionnaire',
      'questionnaire.progress': 'Progress',
      'questionnaire.question': 'Question {{current}} of {{total}}',
      'questionnaire.section': 'Section {{current}} of {{total}}',
      'questionnaire.skip': 'Skip',
      'questionnaire.complete': 'Complete',
      'questionnaire.required': 'Required',
      'questionnaire.optional': 'Optional',
    },
    dashboard: {
      'dashboard.title': 'Dashboard',
      'dashboard.welcome': 'Welcome back, {{name}}!',
      'dashboard.score': 'Readiness Score',
      'dashboard.progress': 'Your Progress',
      'dashboard.recentActivity': 'Recent Activity',
    },
    billing: {
      'billing.title': 'Billing',
      'billing.subscription': 'Subscription',
      'billing.invoices': 'Invoices',
      'billing.upgrade': 'Upgrade',
      'billing.currentPlan': 'Current Plan',
      'billing.paymentMethod': 'Payment Method',
    },
    help: {
      'help.title': 'Help Center',
      'help.search': 'Search for help...',
      'help.categories': 'Categories',
      'help.faq': 'Frequently Asked Questions',
      'help.contact': 'Contact Support',
    },
    errors: {
      'error.generic': 'Something went wrong. Please try again.',
      'error.network': 'Network error. Please check your connection.',
      'error.notFound': 'Page not found',
      'error.unauthorized': 'You are not authorized to view this page.',
      'error.forbidden': 'Access denied',
      'error.serverError': 'Server error. Please try again later.',
    },
    validation: {
      'validation.required': 'This field is required',
      'validation.email': 'Please enter a valid email address',
      'validation.minLength': 'Must be at least {{min}} characters',
      'validation.maxLength': 'Must be no more than {{max}} characters',
      'validation.passwordMatch': 'Passwords do not match',
    },
  },
  es: {
    common: {
      'app.name': 'Quiz2Biz',
      'nav.dashboard': 'Panel',
      'nav.questionnaires': 'Cuestionarios',
      'nav.documents': 'Documentos',
      'nav.analytics': 'Analítica',
      'nav.settings': 'Configuración',
      'nav.help': 'Ayuda',
      'nav.logout': 'Cerrar sesión',
      'button.save': 'Guardar',
      'button.cancel': 'Cancelar',
      'button.submit': 'Enviar',
      'button.next': 'Siguiente',
      'button.previous': 'Anterior',
      'button.delete': 'Eliminar',
      'button.edit': 'Editar',
      'button.close': 'Cerrar',
      'label.loading': 'Cargando...',
      'label.search': 'Buscar',
    },
    auth: {
      'auth.login': 'Iniciar sesión',
      'auth.register': 'Registrarse',
      'auth.email': 'Correo electrónico',
      'auth.password': 'Contraseña',
      'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    },
  },
  fr: {
    common: {
      'app.name': 'Quiz2Biz',
      'nav.dashboard': 'Tableau de bord',
      'nav.questionnaires': 'Questionnaires',
      'nav.documents': 'Documents',
      'nav.analytics': 'Analytique',
      'nav.settings': 'Paramètres',
      'nav.help': 'Aide',
      'nav.logout': 'Déconnexion',
      'button.save': 'Enregistrer',
      'button.cancel': 'Annuler',
      'button.submit': 'Soumettre',
      'button.next': 'Suivant',
      'button.previous': 'Précédent',
      'label.loading': 'Chargement...',
    },
    auth: {
      'auth.login': 'Connexion',
      'auth.register': "S'inscrire",
      'auth.email': 'Email',
      'auth.password': 'Mot de passe',
      'auth.forgotPassword': 'Mot de passe oublié ?',
    },
  },
  de: {
    common: {
      'app.name': 'Quiz2Biz',
      'nav.dashboard': 'Dashboard',
      'nav.questionnaires': 'Fragebögen',
      'nav.documents': 'Dokumente',
      'nav.analytics': 'Analytik',
      'nav.settings': 'Einstellungen',
      'nav.help': 'Hilfe',
      'nav.logout': 'Abmelden',
      'button.save': 'Speichern',
      'button.cancel': 'Abbrechen',
      'button.submit': 'Absenden',
      'button.next': 'Weiter',
      'button.previous': 'Zurück',
      'label.loading': 'Laden...',
    },
    auth: {
      'auth.login': 'Anmelden',
      'auth.register': 'Registrieren',
      'auth.email': 'E-Mail',
      'auth.password': 'Passwort',
      'auth.forgotPassword': 'Passwort vergessen?',
    },
  },
  ja: {
    common: {
      'app.name': 'Quiz2Biz',
      'nav.dashboard': 'ダッシュボード',
      'nav.questionnaires': 'アンケート',
      'nav.documents': 'ドキュメント',
      'nav.analytics': '分析',
      'nav.settings': '設定',
      'nav.help': 'ヘルプ',
      'nav.logout': 'ログアウト',
      'button.save': '保存',
      'button.cancel': 'キャンセル',
      'button.submit': '送信',
      'button.next': '次へ',
      'button.previous': '前へ',
      'label.loading': '読み込み中...',
    },
    auth: {
      'auth.login': 'ログイン',
      'auth.register': '登録',
      'auth.email': 'メールアドレス',
      'auth.password': 'パスワード',
      'auth.forgotPassword': 'パスワードを忘れた場合',
    },
  },
  zh: {
    common: {
      'app.name': 'Quiz2Biz',
      'nav.dashboard': '仪表板',
      'nav.questionnaires': '问卷',
      'nav.documents': '文档',
      'nav.analytics': '分析',
      'nav.settings': '设置',
      'nav.help': '帮助',
      'nav.logout': '退出登录',
      'button.save': '保存',
      'button.cancel': '取消',
      'button.submit': '提交',
      'button.next': '下一步',
      'button.previous': '上一步',
      'label.loading': '加载中...',
    },
    auth: {
      'auth.login': '登录',
      'auth.register': '注册',
      'auth.email': '电子邮件',
      'auth.password': '密码',
      'auth.forgotPassword': '忘记密码？',
    },
  },
  ar: {
    common: {
      'app.name': 'Quiz2Biz',
      'nav.dashboard': 'لوحة التحكم',
      'nav.questionnaires': 'الاستبيانات',
      'nav.documents': 'المستندات',
      'nav.analytics': 'التحليلات',
      'nav.settings': 'الإعدادات',
      'nav.help': 'المساعدة',
      'nav.logout': 'تسجيل الخروج',
      'button.save': 'حفظ',
      'button.cancel': 'إلغاء',
      'button.submit': 'إرسال',
      'button.next': 'التالي',
      'button.previous': 'السابق',
      'label.loading': 'جار التحميل...',
    },
    auth: {
      'auth.login': 'تسجيل الدخول',
      'auth.register': 'التسجيل',
      'auth.email': 'البريد الإلكتروني',
      'auth.password': 'كلمة المرور',
      'auth.forgotPassword': 'نسيت كلمة المرور؟',
    },
  },
  he: {
    common: {
      'app.name': 'Quiz2Biz',
      'nav.dashboard': 'לוח בקרה',
      'nav.questionnaires': 'שאלונים',
      'nav.documents': 'מסמכים',
      'nav.analytics': 'אנליטיקה',
      'nav.settings': 'הגדרות',
      'nav.help': 'עזרה',
      'nav.logout': 'התנתק',
      'button.save': 'שמור',
      'button.cancel': 'ביטול',
      'button.submit': 'שלח',
      'button.next': 'הבא',
      'button.previous': 'הקודם',
      'label.loading': 'טוען...',
    },
    auth: {
      'auth.login': 'התחברות',
      'auth.register': 'הרשמה',
      'auth.email': 'אימייל',
      'auth.password': 'סיסמה',
      'auth.forgotPassword': 'שכחת סיסמה?',
    },
  },
};

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: I18nState = {
  locale: 'en',
  direction: 'ltr',
  translations: new Map(
    Object.entries(defaultTranslations) as [SupportedLocale, Partial<TranslationNamespace>][],
  ),
  loadedNamespaces: new Set(['common', 'auth']),
  isLoading: false,
  fallbackLocale: 'en',
};

// =============================================================================
// STORAGE KEY
// =============================================================================

const STORAGE_KEY = 'quiz2biz_locale';

// =============================================================================
// REDUCER
// =============================================================================

function i18nReducer(state: I18nState, action: I18nAction): I18nState {
  switch (action.type) {
    case 'SET_LOCALE': {
      const config = LOCALE_CONFIGS[action.locale];
      return {
        ...state,
        locale: action.locale,
        direction: config?.direction || 'ltr',
      };
    }

    case 'SET_DIRECTION':
      return { ...state, direction: action.direction };

    case 'LOAD_TRANSLATIONS': {
      const translations = new Map(state.translations);
      const existing = translations.get(action.locale) || {};
      translations.set(action.locale, {
        ...existing,
        [action.namespace]: action.translations,
      });
      const loadedNamespaces = new Set(state.loadedNamespaces);
      loadedNamespaces.add(action.namespace);
      return { ...state, translations, loadedNamespaces };
    }

    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };

    case 'LOAD_STATE':
      return { ...state, ...action.state };

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

const I18nContext = createContext<I18nContextType | null>(null);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: SupportedLocale;
  detectBrowserLocale?: boolean;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  defaultLocale = 'en',
  detectBrowserLocale = true,
}) => {
  const [state, dispatch] = useReducer(i18nReducer, initialState);

  // Detect and set initial locale
  useEffect(() => {
    let initialLocale = defaultLocale;

    // Check localStorage first
    const savedLocale = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
    if (savedLocale && LOCALE_CONFIGS[savedLocale]) {
      initialLocale = savedLocale;
    } else if (detectBrowserLocale && typeof navigator !== 'undefined') {
      // Detect browser locale
      const browserLang = navigator.language.split('-')[0] as SupportedLocale;
      if (LOCALE_CONFIGS[browserLang]) {
        initialLocale = browserLang;
      }
    }

    dispatch({ type: 'SET_LOCALE', locale: initialLocale });
  }, [defaultLocale, detectBrowserLocale]);

  // Apply RTL direction to document
  useEffect(() => {
    document.documentElement.dir = state.direction;
    document.documentElement.lang = state.locale;

    // Add RTL class for CSS styling
    if (state.direction === 'rtl') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [state.direction, state.locale]);

  // Save locale to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, state.locale);
  }, [state.locale]);

  // Translation function
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const [namespace, ...keyParts] = key.split('.');
      const actualKey = keyParts.length > 0 ? keyParts.join('.') : namespace;
      const actualNamespace = keyParts.length > 0 ? namespace : 'common';

      // Try current locale
      const localeTranslations = state.translations.get(state.locale);
      let translation =
        (localeTranslations as Record<string, Record<string, string>>)?.[actualNamespace]?.[key] ||
        (localeTranslations as Record<string, Record<string, string>>)?.[actualNamespace]?.[
          actualKey
        ];

      // Fallback to default locale
      if (!translation && state.locale !== state.fallbackLocale) {
        const fallbackTranslations = state.translations.get(state.fallbackLocale);
        translation =
          (fallbackTranslations as Record<string, Record<string, string>>)?.[actualNamespace]?.[
            key
          ] ||
          (fallbackTranslations as Record<string, Record<string, string>>)?.[actualNamespace]?.[
            actualKey
          ];
      }

      // Return key if no translation found
      if (!translation) {
        return key;
      }

      // Replace parameters
      if (params) {
        Object.entries(params).forEach(([param, value]) => {
          translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
        });
      }

      return translation;
    },
    [state.locale, state.translations, state.fallbackLocale],
  );

  // Change locale
  const changeLocale = useCallback(async (locale: SupportedLocale): Promise<void> => {
    if (!LOCALE_CONFIGS[locale]) {
      console.warn(`[i18n] Unsupported locale: ${locale}`);
      return;
    }

    dispatch({ type: 'SET_LOADING', isLoading: true });

    try {
      // In production, this would load translations from server/CDN
      // For now, we use the default translations
      dispatch({ type: 'SET_LOCALE', locale });
    } catch (error) {
      console.error('[i18n] Failed to change locale:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }, []);

  // Formatting functions
  const formatDate = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions): string => {
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
      };
      return new Intl.DateTimeFormat(state.locale, defaultOptions).format(date);
    },
    [state.locale],
  );

  const formatTime = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions): string => {
      const defaultOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: 'numeric',
        ...options,
      };
      return new Intl.DateTimeFormat(state.locale, defaultOptions).format(date);
    },
    [state.locale],
  );

  const formatDateTime = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions): string => {
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        ...options,
      };
      return new Intl.DateTimeFormat(state.locale, defaultOptions).format(date);
    },
    [state.locale],
  );

  const formatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions): string => {
      const config = LOCALE_CONFIGS[state.locale];
      return new Intl.NumberFormat(state.locale, { ...config.numberFormat, ...options }).format(
        num,
      );
    },
    [state.locale],
  );

  const formatCurrency = useCallback(
    (amount: number, currency?: string): string => {
      const config = LOCALE_CONFIGS[state.locale];
      return new Intl.NumberFormat(state.locale, {
        style: 'currency',
        currency: currency || config.currencyCode,
      }).format(amount);
    },
    [state.locale],
  );

  const formatRelativeTime = useCallback(
    (date: Date): string => {
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffSecs = Math.round(diffMs / 1000);
      const diffMins = Math.round(diffSecs / 60);
      const diffHours = Math.round(diffMins / 60);
      const diffDays = Math.round(diffHours / 24);

      const rtf = new Intl.RelativeTimeFormat(state.locale, { numeric: 'auto' });

      if (Math.abs(diffDays) >= 1) {
        return rtf.format(diffDays, 'day');
      } else if (Math.abs(diffHours) >= 1) {
        return rtf.format(diffHours, 'hour');
      } else if (Math.abs(diffMins) >= 1) {
        return rtf.format(diffMins, 'minute');
      } else {
        return rtf.format(diffSecs, 'second');
      }
    },
    [state.locale],
  );

  // Locale info functions
  const getLocaleConfig = useCallback(
    (locale?: SupportedLocale): LocaleConfig => {
      return LOCALE_CONFIGS[locale || state.locale];
    },
    [state.locale],
  );

  const getSupportedLocales = useCallback((): LocaleConfig[] => {
    return Object.values(LOCALE_CONFIGS);
  }, []);

  const isRTL = useCallback((): boolean => {
    return state.direction === 'rtl';
  }, [state.direction]);

  const contextValue: I18nContextType = {
    ...state,
    t,
    changeLocale,
    formatDate,
    formatTime,
    formatDateTime,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    getLocaleConfig,
    getSupportedLocales,
    isRTL,
  };

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
};

// =============================================================================
// HOOK
// =============================================================================

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// =============================================================================
// UI COMPONENTS
// =============================================================================

const styles = {
  switcher: {
    position: 'relative' as const,
  } as React.CSSProperties,
  switcherButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  flag: {
    fontSize: '18px',
  } as React.CSSProperties,
  dropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 4px)',
    right: 0,
    minWidth: '200px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    overflow: 'hidden',
  } as React.CSSProperties,
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    border: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    textAlign: 'left' as const,
  } as React.CSSProperties,
  dropdownItemActive: {
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
  } as React.CSSProperties,
  localeName: {
    flex: 1,
  } as React.CSSProperties,
  nativeName: {
    color: '#6b7280',
    fontSize: '12px',
  } as React.CSSProperties,
};

// Language Switcher Component
export interface LanguageSwitcherProps {
  showNativeName?: boolean;
  showFlag?: boolean;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  showNativeName = true,
  showFlag = true,
  compact = false,
  className,
  style,
}) => {
  const { locale, changeLocale, getSupportedLocales, getLocaleConfig, isLoading } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const currentConfig = getLocaleConfig();
  const locales = getSupportedLocales();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (newLocale: SupportedLocale) => {
    await changeLocale(newLocale);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={className} style={{ ...styles.switcher, ...style }}>
      <button
        style={styles.switcherButton}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {showFlag && <span style={styles.flag}>{currentConfig.flag}</span>}
        {!compact && <span>{currentConfig.nativeName}</span>}
        <span style={{ fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={styles.dropdown} role="listbox">
          {locales.map((config) => (
            <button
              key={config.code}
              style={{
                ...styles.dropdownItem,
                ...(locale === config.code ? styles.dropdownItemActive : {}),
              }}
              onClick={() => handleSelect(config.code)}
              role="option"
              aria-selected={locale === config.code}
            >
              {showFlag && <span style={styles.flag}>{config.flag}</span>}
              <div style={styles.localeName}>
                <div>{config.name}</div>
                {showNativeName && config.name !== config.nativeName && (
                  <div style={styles.nativeName}>{config.nativeName}</div>
                )}
              </div>
              {locale === config.code && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// RTL Wrapper Component
export interface RTLWrapperProps {
  children: ReactNode;
  forceDirection?: TextDirection;
}

export const RTLWrapper: React.FC<RTLWrapperProps> = ({ children, forceDirection }) => {
  const { direction } = useI18n();
  const effectiveDirection = forceDirection || direction;

  return (
    <div
      dir={effectiveDirection}
      style={{
        textAlign: effectiveDirection === 'rtl' ? 'right' : 'left',
      }}
    >
      {children}
    </div>
  );
};

// Formatted Date Component
export interface FormattedDateProps {
  date: Date | string | number;
  format?: 'date' | 'time' | 'datetime' | 'relative';
  options?: Intl.DateTimeFormatOptions;
}

export const FormattedDate: React.FC<FormattedDateProps> = ({ date, format = 'date', options }) => {
  const { formatDate, formatTime, formatDateTime, formatRelativeTime } = useI18n();
  const dateObj = date instanceof Date ? date : new Date(date);

  let formatted: string;
  switch (format) {
    case 'time':
      formatted = formatTime(dateObj, options);
      break;
    case 'datetime':
      formatted = formatDateTime(dateObj, options);
      break;
    case 'relative':
      formatted = formatRelativeTime(dateObj);
      break;
    default:
      formatted = formatDate(dateObj, options);
  }

  return <span>{formatted}</span>;
};

// Formatted Number Component
export interface FormattedNumberProps {
  value: number;
  format?: 'number' | 'currency' | 'percent';
  currency?: string;
  options?: Intl.NumberFormatOptions;
}

export const FormattedNumber: React.FC<FormattedNumberProps> = ({
  value,
  format = 'number',
  currency,
  options,
}) => {
  const { formatNumber, formatCurrency } = useI18n();

  let formatted: string;
  switch (format) {
    case 'currency':
      formatted = formatCurrency(value, currency);
      break;
    case 'percent':
      formatted = formatNumber(value, { style: 'percent', ...options });
      break;
    default:
      formatted = formatNumber(value, options);
  }

  return <span>{formatted}</span>;
};

// Translation Component
export interface TransProps {
  i18nKey: string;
  params?: Record<string, string | number>;
  defaultValue?: string;
}

export const Trans: React.FC<TransProps> = ({ i18nKey, params, defaultValue }) => {
  const { t } = useI18n();
  const translated = t(i18nKey, params);
  return <>{translated === i18nKey && defaultValue ? defaultValue : translated}</>;
};
