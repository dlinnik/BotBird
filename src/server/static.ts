import fs from 'node:fs';
import path from 'node:path';
import type { Express, Request, Response, NextFunction } from 'express';
import express from 'express';
import { config } from './config.js';

function allowEmbedCors(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}

export function setupStatic(app: Express): void {
  const { widgetDir, embedDir, demoDir } = config.static;

  if (!fs.existsSync(embedDir)) {
    console.warn(`[Static] Embed SDK not found at ${embedDir}. Run: cd embed && npm run build`);
  } else {
    app.use('/embed', allowEmbedCors, express.static(embedDir, { index: false, fallthrough: false }));
    console.log(`[Static] Embed SDK → /embed/ (${embedDir})`);
  }

  if (!fs.existsSync(widgetDir)) {
    console.warn(`[Static] Widget not built at ${widgetDir}. Run: cd client && npm run build`);
  } else {
    app.get(['/widget', '/widget/'], (_req, res) => {
      res.sendFile(path.join(widgetDir, 'index.html'));
    });

    app.use('/widget', express.static(widgetDir, { index: false, redirect: false }));

    app.get('/widget/*', (req, res, next) => {
      if (path.extname(req.path)) {
        next();
        return;
      }
      res.sendFile(path.join(widgetDir, 'index.html'), (err) => {
        if (err) next(err);
      });
    });

    console.log(`[Static] Widget UI → /widget/ (${widgetDir})`);
  }

  if (!fs.existsSync(path.join(demoDir, 'index.html'))) {
    console.warn(`[Static] Demo app not found at ${demoDir}/index.html`);
    return;
  }

  app.get('/demo/env.js', (_req, res) => {
    res.type('application/javascript');
    if (!config.demo.token) {
      res.send('console.error("[BirdBot Demo] DEMO_JWT is not set in .env");');
      return;
    }
    res.send(`window.BIRDBOT_DEMO_TOKEN=${JSON.stringify(config.demo.token)};`);
  });

  app.get(['/demo', '/demo/'], (_req, res) => {
    res.sendFile(path.join(demoDir, 'index.html'));
  });

  app.use('/demo', express.static(demoDir, { index: false, redirect: false }));

  console.log(`[Static] Demo host → /demo/ (${demoDir})`);
}
