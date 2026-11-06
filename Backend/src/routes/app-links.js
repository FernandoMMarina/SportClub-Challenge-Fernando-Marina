const { Router } = require('express');
const venues = require('../data/venues.json');
const assetlinks = require('../config/assetlinks.json');

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function createAppLinksRouter() {
  const router = Router();
  router.get('/.well-known/assetlinks.json', (req, res) => res.json(assetlinks));
  router.get('/venues/:id', (req, res) => {
    const venue = venues.find(item => item.id === req.params.id);
    if (!venue) return res.status(404).type('text').send('No encontramos esa sede.');
    const name = escapeHtml(venue.name);
    const address = escapeHtml(venue.address);
    const url = `sportclubchallenge://venues/${encodeURIComponent(venue.id)}`;
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
    res.type('html').send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><style>body{margin:0;padding:32px 24px;background:#151515;color:#fff;font:17px/1.6 system-ui,sans-serif}main{max-width:480px;margin:10vh auto}h1{font-size:30px;line-height:1.2}p{color:#b9bbc1}a{display:block;background:#d90000;border-radius:24px;padding:14px 24px;color:#fff;text-decoration:none;text-align:center;font-weight:600}.hint{font-size:14px}</style></head><body><main><p>SPORTCLUB</p><h1>${name}</h1><p>${address}</p><a href="${url}">Abrir SportClub</a><p class="hint">Necesitás la app instalada. Si todavía no ingresaste, iniciá sesión para ver las clases de esta sede.</p><p class="hint">Si no se abre, comprobá que tengas instalada la versión 1.0.1 o posterior y habilitados sus enlaces compatibles en los ajustes de Android.</p></main></body></html>`);
  });
  return router;
}
module.exports = { createAppLinksRouter };
