export function GET() {
  return new Response(null, {
    status: 308,
    headers: {
      Location: '/icon.png',
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
