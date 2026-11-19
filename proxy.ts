import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const p = request.nextUrl.pathname;
  if (/^\/(fr|en)(\/|$)/.test(p)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/fr${p === "/" ? "" : p}`;
  return NextResponse.redirect(url);
}
export const config = {
  matcher: ["/((?!api|_next|assets|favicon.ico|sitemap.xml|robots.txt|og).*)"],
};
