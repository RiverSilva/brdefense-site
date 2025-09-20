// static/js/analytics.js
// Sistema de Analytics Avançado para BR Defense Center

class BRDefenseAnalytics {
    constructor() {
        this.startTime = Date.now();
        this.scrollDepth = 0;
        this.maxScrollDepth = 0;
        this.readingTime = 0;
        this.engagementEvents = [];
        this.isArticlePage = document.body.classList.contains('single') || 
                           document.querySelector('article') !== null;
        
        this.init();
    }
    
    init() {
        this.setupScrollTracking();
        this.setupLinkTracking();
        this.setupFormTracking();
        this.setupReadingTime();
        this.setupPageLeaveTracking();
        this.setupErrorTracking();
        this.setupPerformanceTracking();
        
        console.log('🔍 BR Defense Analytics initialized');
    }
    
    // Rastreamento de Scroll e Engajamento
    setupScrollTracking() {
        let ticking = false;
        const scrollHandler = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.updateScrollDepth();
                    ticking = false;
                });
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', scrollHandler, { passive: true });
    }
    
    updateScrollDepth() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
        this.scrollDepth = Math.round((scrollTop / documentHeight) * 100);
        
        if (this.scrollDepth > this.maxScrollDepth) {
            this.maxScrollDepth = this.scrollDepth;
            
            // Eventos de profundidade de scroll
            const milestones = [25, 50, 75, 90];
            milestones.forEach(milestone => {
                if (this.maxScrollDepth >= milestone && 
                    !this[`scroll${milestone}Sent`]) {
                    this[`scroll${milestone}Sent`] = true;
                    this.trackEvent('scroll_depth', {
                        event_category: 'engagement',
                        event_label: `${milestone}%`,
                        value: milestone,
                        non_interaction: true
                    });
                }
            });
        }
    }
    
    // Rastreamento de tempo de leitura
    setupReadingTime() {
        if (!this.isArticlePage) return;
        
        setInterval(() => {
            this.readingTime += 1;
            
            // Eventos de tempo de leitura
            const timepoints = [30, 60, 120, 300]; // segundos
            timepoints.forEach(timepoint => {
                if (this.readingTime === timepoint) {
                    this.trackEvent('reading_time', {
                        event_category: 'engagement',
                        event_label: `${timepoint}s`,
                        value: timepoint,
                        custom_parameters: {
                            article_title: document.title,
                            article_category: this.getArticleCategory()
                        }
                    });
                }
            });
        }, 1000);
    }
    
    // Rastreamento de links
    setupLinkTracking() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            
            const href = link.href;
            
            // Links externos
            if (href && !href.includes(location.hostname) && href.startsWith('http')) {
                this.trackEvent('external_link_click', {
                    event_category: 'outbound',
                    event_label: href,
                    link_domain: new URL(href).hostname,
                    link_text: link.textContent.trim().substring(0, 50)
                });
            }
            
            // Links para download
            if (href && /\.(pdf|zip|doc|docx|xls|xlsx|ppt|pptx)$/i.test(href)) {
                this.trackEvent('file_download', {
                    event_category: 'downloads',
                    event_label: href,
                    file_extension: href.split('.').pop().toLowerCase(),
                    file_name: href.split('/').pop()
                });
            }
            
            // Links de navegação interna
            if (href && href.includes(location.hostname)) {
                this.trackEvent('internal_link_click', {
                    event_category: 'navigation',
                    event_label: href,
                    link_text: link.textContent.trim().substring(0, 50),
                    source_page: location.pathname
                });
            }
        });
    }
    
    // Rastreamento de formulários
    setupFormTracking() {
        // Busca
        const searchForms = document.querySelectorAll('.mobile-search-form, .widget-search__form');
        searchForms.forEach(form => {
            form.addEventListener('submit', (e) => {
                const query = form.querySelector('input[name="q"]').value.trim();
                if (query) {
                    this.trackEvent('search', {
                        event_category: 'site_search',
                        search_term: query.substring(0, 100), // Limita o tamanho
                        search_location: form.closest('.mobile-search-area') ? 'mobile' : 'sidebar'
                    });
                }
            });
        });
        
        // Newsletter (se existir)
        const newsletterForms = document.querySelectorAll('.newsletter-form, .subscribe-form');
        newsletterForms.forEach(form => {
            form.addEventListener('submit', () => {
                this.trackEvent('newsletter_signup', {
                    event_category: 'conversion',
                    event_label: 'newsletter_subscription',
                    value: 1
                });
            });
        });
        
        // Contato (se existir)
        const contactForms = document.querySelectorAll('.contact-form');
        contactForms.forEach(form => {
            form.addEventListener('submit', () => {
                this.trackEvent('contact_form_submit', {
                    event_category: 'conversion',
                    event_label: 'contact_form',
                    value: 1
                });
            });
        });
    }
    
    // Rastreamento de saída da página
    setupPageLeaveTracking() {
        window.addEventListener('beforeunload', () => {
            const timeOnPage = Math.round((Date.now() - this.startTime) / 1000);
            
            if (this.isArticlePage && timeOnPage >= 10) {
                this.trackEvent('article_engagement', {
                    event_category: 'engagement',
                    event_label: document.title.substring(0, 100),
                    custom_parameters: {
                        time_on_page: timeOnPage,
                        scroll_depth: this.maxScrollDepth,
                        article_category: this.getArticleCategory(),
                        article_tags: this.getArticleTags(),
                        reading_completion: this.maxScrollDepth >= 75 ? 'completed' : 'partial'
                    },
                    transport_type: 'beacon'
                });
            }
        });
        
        // Visibilidade da página
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('page_hidden', {
                    event_category: 'engagement',
                    time_on_page: Math.round((Date.now() - this.startTime) / 1000),
                    non_interaction: true
                });
            } else {
                this.trackEvent('page_visible', {
                    event_category: 'engagement',
                    non_interaction: true
                });
            }
        });
    }
    
    // Rastreamento de erros
    setupErrorTracking() {
        window.addEventListener('error', (e) => {
            this.trackEvent('javascript_error', {
                event_category: 'errors',
                event_label: `${e.filename}:${e.lineno}`,
                error_message: e.message.substring(0, 100),
                error_filename: e.filename,
                error_line: e.lineno,
                non_interaction: true
            });
        });
        
        // Erros de imagem
        document.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG') {
                this.trackEvent('image_error', {
                    event_category: 'errors',
                    event_label: e.target.src,
                    image_alt: e.target.alt || 'no-alt',
                    non_interaction: true
                });
            }
        }, true);
    }
    
    // Rastreamento de performance
    setupPerformanceTracking() {
        window.addEventListener('load', () => {
            // Usa setTimeout para garantir que todas as métricas estejam disponíveis
            setTimeout(() => {
                if ('performance' in window) {
                    const nav = performance.getEntriesByType('navigation')[0];
                    if (nav) {
                        this.trackEvent('page_timing', {
                            event_category: 'performance',
                            custom_parameters: {
                                dns_time: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
                                connect_time: Math.round(nav.connectEnd - nav.connectStart),
                                response_time: Math.round(nav.responseEnd - nav.responseStart),
                                dom_content_loaded: Math.round(nav.domContentLoadedEventEnd - nav.navigationStart),
                                load_complete: Math.round(nav.loadEventEnd - nav.navigationStart)
                            },
                            non_interaction: true
                        });
                    }
                    
                    // Core Web Vitals
                    this.trackCoreWebVitals();
                }
            }, 1000);
        });
    }
    
    // Core Web Vitals (LCP, FID, CLS)
    trackCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            try {
                const po = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    
                    this.trackEvent('core_web_vitals', {
                        event_category: 'performance',
                        metric_name: 'LCP',
                        metric_value: Math.round(lastEntry.startTime),
                        metric_rating: lastEntry.startTime < 2500 ? 'good' : 
                                     lastEntry.startTime < 4000 ? 'needs_improvement' : 'poor',
                        non_interaction: true
                    });
                });
                
                po.observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (e) {
                console.warn('LCP tracking not supported');
            }
            
            // First Input Delay (FID)
            try {
                const po2 = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        const fid = entry.processingStart - entry.startTime;
                        
                        this.trackEvent('core_web_vitals', {
                            event_category: 'performance',
                            metric_name: 'FID',
                            metric_value: Math.round(fid),
                            metric_rating: fid < 100 ? 'good' : 
                                         fid < 300 ? 'needs_improvement' : 'poor',
                            non_interaction: true
                        });
                    });
                });
                
                po2.observe({ entryTypes: ['first-input'] });
            } catch (e) {
                console.warn('FID tracking not supported');
            }
        }
        
        // Cumulative Layout Shift (CLS) - versão simplificada
        let clsValue = 0;
        let clsEntries = [];
        
        if ('PerformanceObserver' in window) {
            try {
                const po3 = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        if (!entry.hadRecentInput) {
                            clsEntries.push(entry);
                            clsValue += entry.value;
                        }
                    });
                });
                
                po3.observe({ entryTypes: ['layout-shift'] });
                
                // Enviar CLS quando a página for escondida
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden && clsValue > 0) {
                        this.trackEvent('core_web_vitals', {
                            event_category: 'performance',
                            metric_name: 'CLS',
                            metric_value: Math.round(clsValue * 1000) / 1000,
                            metric_rating: clsValue < 0.1 ? 'good' : 
                                         clsValue < 0.25 ? 'needs_improvement' : 'poor',
                            non_interaction: true
                        });
                    }
                });
            } catch (e) {
                console.warn('CLS tracking not supported');
            }
        }
    }
    
    // Helpers
    getArticleCategory() {
        const categoryMeta = document.querySelector('meta[property="article:section"]');
        if (categoryMeta) return categoryMeta.content;
        
        const breadcrumbs = document.querySelector('.breadcrumbs');
        if (breadcrumbs) {
            const links = breadcrumbs.querySelectorAll('a');
            return links.length > 1 ? links[1].textContent.trim() : 'uncategorized';
        }
        
        return 'uncategorized';
    }
    
    getArticleTags() {
        const tags = [];
        const tagElements = document.querySelectorAll('.tags__link, .post__tags a');
        tagElements.forEach(tag => tags.push(tag.textContent.trim()));
        return tags.join(',').substring(0, 100); // Limita o tamanho
    }
    
    // Método principal para enviar eventos
    trackEvent(eventName, parameters = {}) {
        if (typeof gtag === 'function') {
            // Adiciona informações padrão
            const defaultParams = {
                page_title: document.title,
                page_location: window.location.href,
                page_path: window.location.pathname,
                timestamp: new Date().toISOString()
            };
            
            const eventParams = { ...defaultParams, ...parameters };
            
            // Remove parâmetros undefined ou null
            Object.keys(eventParams).forEach(key => {
                if (eventParams[key] === undefined || eventParams[key] === null) {
                    delete eventParams[key];
                }
            });
            
            gtag('event', eventName, eventParams);
            
            console.log(`📊 Event tracked: ${eventName}`, eventParams);
        } else {
            console.warn('gtag not available, event not sent:', eventName, parameters);
        }
    }
    
    // Métodos públicos para uso em outros scripts
    trackCustomEvent(eventName, category, label, value, customParams = {}) {
        this.trackEvent(eventName, {
            event_category: category,
            event_label: label,
            value: value,
            ...customParams
        });
    }
    
    trackConversion(conversionName, value = 1, currency = 'BRL') {
        this.trackEvent('conversion', {
            event_category: 'conversions',
            event_label: conversionName,
            value: value,
            currency: currency
        });
    }
    
    trackArticleShare(platform, articleTitle) {
        this.trackEvent('share', {
            event_category: 'social',
            event_label: platform,
            content_type: 'article',
            item_id: window.location.pathname,
            article_title: articleTitle.substring(0, 100)
        });
    }
    
    trackNewsletterInteraction(action, source = 'unknown') {
        this.trackEvent('newsletter_interaction', {
            event_category: 'newsletter',
            event_label: action,
            interaction_source: source
        });
    }
}

// Sistema de Consentimento de Cookies (LGPD/GDPR)
class CookieConsent {
    constructor() {
        this.consentKey = 'brdefense_cookie_consent';
        this.analyticsKey = 'brdefense_analytics_consent';
        this.init();
    }
    
    init() {
        if (!this.hasConsent()) {
            this.showConsentBanner();
        } else if (this.hasAnalyticsConsent()) {
            this.initializeAnalytics();
        }
    }
    
    hasConsent() {
        return localStorage.getItem(this.consentKey) === 'true';
    }
    
    hasAnalyticsConsent() {
        return localStorage.getItem(this.analyticsKey) === 'true';
    }
    
    showConsentBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.innerHTML = `
            <div style="
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #2a2a2a;
                color: white;
                padding: 20px;
                z-index: 10000;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
            ">
                <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 300px;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.4;">
                            🍪 Utilizamos cookies para melhorar sua experiência e analisar o tráfego do site. 
                            Ao continuar navegando, você concorda com nossa 
                            <a href="/privacy" style="color: #e22d30;">Política de Privacidade</a>.
                        </p>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="cookieConsent.acceptAll()" style="
                            background: #e22d30;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                        ">Aceitar Todos</button>
                        <button onclick="cookieConsent.acceptEssential()" style="
                            background: transparent;
                            color: white;
                            border: 1px solid white;
                            padding: 10px 20px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">Apenas Essenciais</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(banner);
    }
    
    acceptAll() {
        localStorage.setItem(this.consentKey, 'true');
        localStorage.setItem(this.analyticsKey, 'true');
        this.hideBanner();
        this.initializeAnalytics();
    }
    
    acceptEssential() {
        localStorage.setItem(this.consentKey, 'true');
        localStorage.setItem(this.analyticsKey, 'false');
        this.hideBanner();
    }
    
    hideBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.remove();
        }
    }
    
    initializeAnalytics() {
        // Inicializa o sistema de analytics
        if (typeof gtag === 'function') {
            gtag('consent', 'update', {
                'analytics_storage': 'granted'
            });
        }
        
        // Inicializa o BR Defense Analytics
        if (!window.brDefenseAnalytics) {
            window.brDefenseAnalytics = new BRDefenseAnalytics();
        }
    }
}

// Inicialização automática
document.addEventListener('DOMContentLoaded', function() {
    // Inicializa sistema de consentimento
    window.cookieConsent = new CookieConsent();
    
    // Adiciona classe para identificar tipo de página
    if (document.querySelector('article')) {
        document.body.classList.add('single');
    }
    
    if (document.querySelector('.list__item')) {
        document.body.classList.add('list');
    }
});

// Funções globais para uso em templates
window.trackCustomEvent = function(eventName, category, label, value, customParams) {
    if (window.brDefenseAnalytics) {
        window.brDefenseAnalytics.trackCustomEvent(eventName, category, label, value, customParams);
    }
};

window.trackArticleShare = function(platform, articleTitle) {
    if (window.brDefenseAnalytics) {
        window.brDefenseAnalytics.trackArticleShare(platform, articleTitle);
    }
};

window.trackNewsletterInteraction = function(action, source) {
    if (window.brDefenseAnalytics) {
        window.brDefenseAnalytics.trackNewsletterInteraction(action, source);
    }
};
