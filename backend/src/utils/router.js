// Minimal path-parameter router shared by the local dev server and the
// Lambda entrypoint, so both drive the exact same route table
// (config/routes.js) instead of two separate route definitions drifting
// apart. Deliberately hand-rolled instead of pulling in Express/a router
// package — the matching rules needed here are small and static.

export function matchRoute(routes, method, path) {
  const pathSegments = path.split('/').filter(Boolean)

  for (const route of routes) {
    if (route.method !== method) continue

    const routeSegments = route.path.split('/').filter(Boolean)
    if (routeSegments.length !== pathSegments.length) continue

    const pathParameters = {}
    let matched = true

    for (let i = 0; i < routeSegments.length; i += 1) {
      const routeSegment = routeSegments[i]
      const pathSegment = pathSegments[i]

      if (routeSegment.startsWith(':')) {
        pathParameters[routeSegment.slice(1)] = decodeURIComponent(pathSegment)
      } else if (routeSegment !== pathSegment) {
        matched = false
        break
      }
    }

    if (matched) {
      return { handler: route.handler, pathParameters }
    }
  }

  return null
}
