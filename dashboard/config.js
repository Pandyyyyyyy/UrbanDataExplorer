(function () {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('api');
    const fromEnv = window.__UDE_API_BASE__;
    window.API_BASE_URL = fromQuery || fromEnv || 'http://localhost:8001';
})();
