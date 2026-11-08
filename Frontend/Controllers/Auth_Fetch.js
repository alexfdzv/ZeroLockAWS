// Agrega automáticamente el token de sesión (Authorization: Bearer <token>)
// a todas las peticiones hacia /api, para que el backend pueda verificar
// que cada usuario solo acceda a sus propios datos.
(function () {
    const originalFetch = window.fetch.bind(window);

    window.fetch = function (input, init = {}) {
        const url = typeof input === 'string' ? input : input.url;
        const token = localStorage.getItem('token');

        if (token && url.startsWith('/api/')) {
            const headers = new Headers(init.headers || {});
            if (!headers.has('Authorization')) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            init = { ...init, headers };
        }
        return originalFetch(input, init);
    };
})();
