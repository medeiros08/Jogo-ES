// Guardando os jogos e as páginas do site no aparelho, para abrirem mesmo sem internet.
// O montar_portal.py preenche VERSION e FILES na cópia que vai para o site.
const VERSION = "e94c340983ab"
const FILES = [
  "apple-touch-icon.png",
  "arcade/esteira.js",
  "arcade/estilo.css",
  "arcade/index.html",
  "arcade/ninja.js",
  "arcade/nucleo.js",
  "arcade/robo.js",
  "atividades/index.html",
  "caca-bugs/index.html",
  "certificado/index.html",
  "conecta/index.html",
  "dupla/index.html",
  "escola/atividades.html",
  "escola/certificado.html",
  "escola/conecta/index.html",
  "escola/dupla/index.html",
  "escola/index.html",
  "escola/mapas-dupla.html",
  "escola/ninja/index.html",
  "escola/robo/index.html",
  "escola/roteiro.html",
  "escola/slides.html",
  "icone-192.png",
  "icone-512.png",
  "icone.svg",
  "index.html",
  "manifest.webmanifest",
  "mapas/index.html",
  "ninja/index.html",
  "oficina/construtor.html",
  "oficina/index.html",
  "prompt/index.html",
  "robo/index.html",
  "roteiro/index.html",
  "slides/index.html"
]
const CACHE = "jogo-es"
const SCOPE = new URL(self.registration.scope)
const FONTS = ["fonts.googleapis.com", "fonts.gstatic.com"]

// "pasta/" e "pasta/index.html" são a mesma página, então ficam guardadas com o mesmo nome
function keyOf(address) {
  const url = new URL(address, SCOPE)
  url.hash = ""
  if (url.pathname.endsWith("/index.html")) url.pathname = url.pathname.slice(0, -"index.html".length)
  return url.href
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await Promise.all(FILES.map(async file => {
      try {
        const response = await fetch(new URL(file, SCOPE), { cache: "reload" })
        if (response.ok && !response.redirected) await cache.put(keyOf(file), response)
      } catch {}
    }))
    await self.skipWaiting()
  })())
})

self.addEventListener("activate", event => event.waitUntil(self.clients.claim()))

self.addEventListener("fetch", event => {
  const request = event.request
  if (request.method !== "GET" || request.headers.has("range")) return
  const url = new URL(request.url)
  if (FONTS.includes(url.hostname)) return event.respondWith(cacheFirst(request))
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return
  event.respondWith(networkFirst(request))
})

// Com internet, a página vem sempre nova (e a cópia guardada é atualizada).
// Sem internet, ou se a rede demorar mais de 4 segundos, vem a cópia guardada.
async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  const key = keyOf(request.url)
  const network = fetch(request).then(response => {
    if (response.status === 200 && !response.redirected) cache.put(key, response.clone()).catch(() => {})
    return response
  })
  const options = { ignoreVary: true }
  const saved = async () => await cache.match(key, options)
    || await cache.match(key, { ...options, ignoreSearch: true })
    || await cache.match(`${key}/`, options)
  const slow = new Promise(resolve => setTimeout(resolve, 4000)).then(saved).then(hit => hit || network)
  try {
    return await Promise.race([network, slow])
  } catch {
    return await saved() || Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(request, { ignoreVary: true })
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok || response.type === "opaque") cache.put(request, response.clone()).catch(() => {})
  return response
}
