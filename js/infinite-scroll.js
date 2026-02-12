// Rolagem Infinita Universal - BR Defense Center
// Funciona em Home e News automaticamente

(function() {
    'use strict';

    // Detecta o tipo de página
    const pageType = detectPageType();
    
    if (!pageType) {
        console.log('[Infinite Scroll] Página não suportada');
        return;
    }

    console.log(`[Infinite Scroll] Inicializando para página: ${pageType}`);

    // Configuração baseada no tipo de página
    const config = {
        debug: true,
        buttonText: 'Carregar Mais Notícias',
        loadingText: 'Carregando...',
        noMoreText: 'Não há mais notícias',
        scrollThreshold: 100,
        fadeInDuration: 600,
        retryAttempts: 3,
        retryDelay: 1000,
        pageType: pageType
    };

    // State management
    const state = {
        currentPage: 1,
        totalPages: 1,
        loading: false,
        hasMore: true,
        retryCount: 0
    };

    // Elementos DOM
    const elements = {
        postsContainer: null,
        pagination: null,
        loadMoreButton: null,
        lastPost: null
    };

    // Detecta tipo de página
    function detectPageType() {
        const path = window.location.pathname;
        
        if (path === '/' || path === '/index.html' || path === '') {
            return 'home';
        } else if (path.startsWith('/news/') || path === '/news') {
            return 'news';
        }
        
        return null;
    }

    // Gera URL da próxima página baseada no tipo
    function getNextPageUrl(pageNumber) {
        switch (config.pageType) {
            case 'home':
                return `/page/${pageNumber}/`;
            case 'news':
                return `/news/page/${pageNumber}/`;
            default:
                return null;
        }
    }

    // Função de log condicional
    function log(...args) {
        if (config.debug) {
            console.log(`[${config.pageType.toUpperCase()} Infinite Scroll]`, ...args);
        }
    }

    // Inicialização
    function init() {
        log('Inicializando rolagem infinita...');
        
        // Inicializa elementos DOM
        if (!initializeElements()) {
            log('Erro ao inicializar elementos DOM');
            return;
        }

        // Extrai informações de paginação
        extractPaginationInfo();

        // Setup dos event listeners
        setupEventListeners();

        // Cria botão "Carregar Mais"
        createLoadMoreButton();

        log('Rolagem infinita inicializada com sucesso!');
        log('Estado inicial:', state);
    }

    // Inicializa elementos DOM
    function initializeElements() {
        // Container principal dos posts
        elements.postsContainer = document.querySelector('main.list');
        
        // Elemento de paginação
        elements.pagination = document.querySelector('.pagination');
        
        // Último post atual
        elements.lastPost = document.querySelector('.list__item:last-of-type');

        if (!elements.postsContainer) {
            log('Erro: Container de posts não encontrado');
            return false;
        }

        log('Elementos DOM encontrados:', {
            postsContainer: !!elements.postsContainer,
            pagination: !!elements.pagination,
            lastPost: !!elements.lastPost
        });

        return true;
    }

    // Extrai informações de paginação do HTML
    function extractPaginationInfo() {
        if (!elements.pagination) {
            log('Nenhuma paginação encontrada - página única');
            state.hasMore = false;
            return;
        }

        // Busca por padrão "X/Y" no HTML
        const paginationText = elements.pagination.textContent;
        const match = paginationText.match(/(\d+)\/(\d+)/);
        
        if (match) {
            state.currentPage = parseInt(match[1]);
            state.totalPages = parseInt(match[2]);
            state.hasMore = state.currentPage < state.totalPages;
            
            log('Paginação extraída:', {
                currentPage: state.currentPage,
                totalPages: state.totalPages,
                hasMore: state.hasMore
            });
        } else {
            // Tenta extrair de links de paginação
            const nextLink = elements.pagination.querySelector('.pagination__item--next');
            if (nextLink) {
                state.hasMore = true;
                log('Link "próxima" encontrado - há mais páginas');
            } else {
                state.hasMore = false;
                log('Não há link "próxima" - última página');
            }
        }
    }

    // Setup dos event listeners
    function setupEventListeners() {
        // Scroll listener para carregamento automático
        let ticking = false;
        
        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll);
        log('Event listeners configurados');
    }

    // Handle scroll event
    function handleScroll() {
        if (state.loading || !state.hasMore) return;

        const scrollPosition = window.scrollY + window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const distanceFromBottom = documentHeight - scrollPosition;

        if (distanceFromBottom <= config.scrollThreshold) {
            log('Próximo do final da página, carregando mais posts...');
            loadMorePosts();
        }
    }

    // Cria botão "Carregar Mais"
    function createLoadMoreButton() {
        if (!elements.pagination || !state.hasMore) {
            log('Sem paginação ou sem mais páginas - não criando botão');
            return;
        }

        // Cria o botão
        elements.loadMoreButton = document.createElement('button');
        elements.loadMoreButton.className = 'btn load-more-btn';
        elements.loadMoreButton.textContent = config.buttonText;
        
        // Adiciona event listener
        elements.loadMoreButton.addEventListener('click', (e) => {
            e.preventDefault();
            loadMorePosts();
        });

        // Insere após a paginação
        elements.pagination.insertAdjacentElement('afterend', elements.loadMoreButton);

        // Esconde a paginação original
        elements.pagination.style.display = 'none';

        // Adiciona estilos
        addLoadMoreButtonStyles();

        log('Botão "Carregar Mais" criado');
    }

    // Adiciona estilos para o botão
    function addLoadMoreButtonStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .load-more-btn {
                display: block;
                margin: 2rem auto;
                padding: 12px 24px;
                background: #2c5aa0;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                transition: all 0.3s ease;
                min-width: 200px;
            }
            
            .load-more-btn:hover {
                background: #1e3d6f;
                transform: translateY(-1px);
            }
            
            .load-more-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
            }
            
            .load-more-btn.loading {
                background: #666;
                cursor: wait;
            }
            
            .load-more-btn.no-more {
                background: #28a745;
                cursor: default;
            }
            
            /* Animação de fade-in para novos posts */
            .list__item.fade-in {
                opacity: 0;
                transform: translateY(20px);
                animation: fadeInUp ${config.fadeInDuration}ms ease forwards;
            }
            
            @keyframes fadeInUp {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Carrega mais posts
    async function loadMorePosts() {
        if (state.loading || !state.hasMore) {
            log('Já carregando ou não há mais posts');
            return;
        }

        state.loading = true;
        updateButtonState('loading');

        try {
            const nextPage = state.currentPage + 1;
            log(`Carregando página ${nextPage}...`);

            const nextPageUrl = getNextPageUrl(nextPage);
            if (!nextPageUrl) {
                throw new Error('Não foi possível gerar URL da próxima página');
            }
            
            const response = await fetch(nextPageUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            const newPosts = extractPostsFromHTML(html);

            if (newPosts.length === 0) {
                log('Nenhum post encontrado na resposta');
                state.hasMore = false;
                updateButtonState('no-more');
                return;
            }

            // Adiciona novos posts com animação
            appendNewPosts(newPosts);

            // Atualiza estado
            state.currentPage = nextPage;
            state.hasMore = nextPage < state.totalPages;
            state.retryCount = 0;

            log(`Página ${nextPage} carregada com sucesso! ${newPosts.length} posts adicionados`);

            // Atualiza botão
            if (state.hasMore) {
                updateButtonState('normal');
            } else {
                updateButtonState('no-more');
            }

        } catch (error) {
            log('Erro ao carregar posts:', error);
            
            // Retry logic
            if (state.retryCount < config.retryAttempts) {
                state.retryCount++;
                log(`Tentativa ${state.retryCount}/${config.retryAttempts} em ${config.retryDelay}ms...`);
                
                setTimeout(() => {
                    state.loading = false;
                    loadMorePosts();
                }, config.retryDelay);
            } else {
                log('Máximo de tentativas atingido');
                updateButtonState('error');
            }
        } finally {
            if (state.retryCount === 0) {
                state.loading = false;
            }
        }
    }

    // Extrai posts do HTML da próxima página
    function extractPostsFromHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Busca todos os posts na nova página
        const posts = doc.querySelectorAll('.list__item.post');
        
        log(`Extraídos ${posts.length} posts da página`);
        return Array.from(posts);
    }

    // Adiciona novos posts ao container
    function appendNewPosts(posts) {
        const fragment = document.createDocumentFragment();

        posts.forEach((post, index) => {
            // Clona o post
            const clonedPost = post.cloneNode(true);
            
            // Adiciona classe para animação
            clonedPost.classList.add('fade-in');
            
            // Delay progressivo para animação
            clonedPost.style.animationDelay = `${index * 100}ms`;
            
            fragment.appendChild(clonedPost);
        });

        // Adiciona todos os posts de uma vez
        elements.postsContainer.appendChild(fragment);

        log(`${posts.length} posts adicionados ao DOM`);
    }

    // Atualiza estado do botão
    function updateButtonState(state) {
        if (!elements.loadMoreButton) return;

        // Remove classes anteriores
        elements.loadMoreButton.classList.remove('loading', 'no-more', 'error');

        switch (state) {
            case 'loading':
                elements.loadMoreButton.textContent = config.loadingText;
                elements.loadMoreButton.classList.add('loading');
                elements.loadMoreButton.disabled = true;
                break;

            case 'no-more':
                elements.loadMoreButton.textContent = config.noMoreText;
                elements.loadMoreButton.classList.add('no-more');
                elements.loadMoreButton.disabled = true;
                break;

            case 'error':
                elements.loadMoreButton.textContent = 'Erro ao carregar. Clique para tentar novamente.';
                elements.loadMoreButton.classList.add('error');
                elements.loadMoreButton.disabled = false;
                break;

            case 'normal':
            default:
                elements.loadMoreButton.textContent = config.buttonText;
                elements.loadMoreButton.disabled = false;
                break;
        }
    }

    // Inicializa quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expõe funções para debug
    if (config.debug) {
        window.infiniteScroll = {
            pageType: config.pageType,
            state,
            elements,
            loadMore: loadMorePosts,
            config
        };
    }

})();
