// Zero-dependency local dev server. Translates plain Node HTTP requests
// into the same API-Gateway-proxy-shaped `event` object the Lambda
// entrypoint (index.js) consumes, so handlers never know whether they're
// running locally or deployed.
import http from 'node:http'
import { handler } from './index.js'
import { logger } from './utils/logger.js'

const PORT = Number(process.env.PORT ?? 3001)

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const body = await readRequestBody(req)

    const event = {
      httpMethod: req.method,
      path: url.pathname,
      queryStringParameters: Object.fromEntries(url.searchParams.entries()),
      headers: req.headers,
      body: body || null,
      pathParameters: {},
    }

    const result = await handler(event, {})
    res.writeHead(result.statusCode, result.headers)
    res.end(result.body)
  } catch (err) {
    logger.error('Local server request failed', {
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } }))
  }
})

server.listen(PORT, () => {
  logger.info(`TestSense AI backend listening`, { url: `http://localhost:${PORT}` })
})
