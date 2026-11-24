import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const p = request.nextUrl.pathname;
  if (/^\/(fr|en)(\/|$)/.test(p)) {
    const [, lang, section] = p.split("/");
    if (["mon-univers", "reflexions", "observations", "sport-culture", "societe", "a-propos"].includes(section)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${lang}`;
      url.search = "";
      return NextResponse.redirect(url);
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-site-locale", p.split("/")[1]);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  const url = request.nextUrl.clone();
  url.pathname = `/fr${p === "/" ? "" : p}`;
  return NextResponse.redirect(url);
}
export const config = {
  matcher: ["/((?!api|_next|assets|favicon.ico|sitemap.xml|robots.txt|og).*)"],
};
