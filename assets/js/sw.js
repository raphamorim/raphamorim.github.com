var APP_PREFIX = 'Raphamorim'
var VERSION = '0.0.1' // Version of the off-line cache (change this value everytime you want to update cache)
var CACHE_NAME = APP_PREFIX + VERSION
var URLS = [ // Add URL you want to cache in this list.
  '/', // If you have separate JS/CSS files,
  '/index.html'            // add path to those files here
  // '/{repository}/index.html'            // add path to those files here
]

// Respond with cached resources
self.addEventListener('fetch', function (e) {
  e.respondWith(
    caches.match(e.request).then(function (request) {
      if (request) {
        return request
      } else {
        return fetch(e.request)
      }
    })
  )
})

// Cache resources
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(URLS)
    })
  )
})
