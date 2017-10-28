import { join } from 'path'
import { existsSync } from 'fs'
import { createElement } from 'react'
import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import send from 'send'
import generateETag from 'etag'
import fresh from 'fresh'
import requireModule from './require'
import getConfig from './config'
import resolvePath from './resolve'
import { Router } from '../lib/router'
import { loadGetInitialProps } from '../lib/utils'
import Head, { defaultHead } from '../lib/head'
import App from '../lib/app'
import ErrorDebug from '../lib/error-debug'
import { flushChunks } from '../lib/dynamic'
import xssFilters from 'xss-filters'
import React from 'react'
import Bench from './bench'

export function render (req, res, pathname, query, opts) {
  const html = renderToHTML(req, res, pathname, query, opts)
  sendHTML(req, res, html, req.method, opts)
}

export function renderToHTML (req, res, pathname, query, opts) {
  return doRender(req, res, pathname, query, opts)
}

export async function renderError (err, req, res, pathname, query, opts) {
  const html = await renderErrorToHTML(err, req, res, query, opts)
  sendHTML(req, res, html, req.method, opts)
}

export function renderErrorToHTML (err, req, res, pathname, query, opts = {}) {
  return doRender(req, res, pathname, query, { ...opts, err, page: '_error' })
}

function doRender () {
  return '<!DOCTYPE html>' + renderToString(<Bench />)
}

export async function renderScript (req, res, page, opts) {
  try {
    const dist = getConfig(opts.dir).distDir
    const path = join(opts.dir, dist, 'bundles', 'pages', page)
    const realPath = await resolvePath(path)
    await serveStatic(req, res, realPath)
  } catch (err) {
    if (err.code === 'ENOENT') {
      renderScriptError(req, res, page, err, {}, opts)
      return
    }

    throw err
  }
}

export async function renderScriptError (req, res, page, error, customFields, { dev }) {
  // Asks CDNs and others to not to cache the errored page
  res.setHeader('Cache-Control', 'no-store, must-revalidate')
  // prevent XSS attacks by filtering the page before printing it.
  page = xssFilters.uriInSingleQuotedAttr(page)
  res.setHeader('Content-Type', 'text/javascript')

  if (error.code === 'ENOENT') {
    res.end(`
      window.__NEXT_REGISTER_PAGE('${page}', function() {
        var error = new Error('Page does not exist: ${page}')
        error.statusCode = 404

        return { error: error }
      })
    `)
    return
  }

  const errorJson = {
    ...serializeError(dev, error),
    ...customFields
  }

  res.end(`
    window.__NEXT_REGISTER_PAGE('${page}', function() {
      var error = ${JSON.stringify(errorJson)}
      return { error: error }
    })
  `)
}

export function sendHTML (req, res, html, method, { dev }) {
  if (res.finished) return
  // const etag = generateETag(html)

  if (fresh(req.headers, {})) {
    res.statusCode = 304
    res.end()
    return
  }

  if (dev) {
    // In dev, we should not cache pages for any reason.
    // That's why we do this.
    res.setHeader('Cache-Control', 'no-store, must-revalidate')
  }

  // res.setHeader('ETag', etag)
  res.setHeader('Content-Type', 'text/html')
  // res.setHeader('Content-Length', Buffer.byteLength(html))
  res.end(method === 'HEAD' ? null : html)
}

export function sendJSON (res, obj, method) {
  if (res.finished) return

  const json = JSON.stringify(obj)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Length', Buffer.byteLength(json))
  res.end(method === 'HEAD' ? null : json)
}

function errorToJSON (err) {
  const { name, message, stack } = err
  const json = { name, message, stack }

  if (err.module) {
    // rawRequest contains the filename of the module which has the error.
    const { rawRequest } = err.module
    json.module = { rawRequest }
  }

  return json
}

function serializeError (dev, err) {
  if (dev) {
    return errorToJSON(err)
  }

  return { message: '500 - Internal Server Error.' }
}

export function serveStatic (req, res, path) {
  return new Promise((resolve, reject) => {
    send(req, path)
    .on('directory', () => {
      // We don't allow directories to be read.
      const err = new Error('No directory access')
      err.code = 'ENOENT'
      reject(err)
    })
    .on('error', reject)
    .pipe(res)
    .on('finish', resolve)
  })
}

async function ensurePage (page, { dir, hotReloader }) {
  if (!hotReloader) return
  if (page === '_error' || page === '_document') return

  await hotReloader.ensurePage(page)
}

function loadChunks ({ dev, dir, dist, availableChunks }) {
  const flushedChunks = flushChunks()
  const validChunks = []

  for (var chunk of flushedChunks) {
    const filename = join(dir, dist, 'chunks', chunk)
    const exists = dev ? existsSync(filename) : availableChunks[chunk]
    if (exists) {
      validChunks.push(chunk)
    }
  }

  return validChunks
}
