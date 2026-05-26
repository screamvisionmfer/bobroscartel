import { NextResponse, type NextRequest } from "next/server";

let warnedAboutMissingPassword = false;

export function middleware(request: NextRequest) {
  const password = process.env.GAME_PREVIEW_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV !== "production") {
      if (!warnedAboutMissingPassword) {
        warnedAboutMissingPassword = true;
        console.warn("GAME_PREVIEW_PASSWORD is not set; allowing game preview routes in development.");
      }

      return NextResponse.next();
    }

    return unauthorized();
  }

  if (!isAuthorized(request.headers.get("authorization"), password)) {
    return unauthorized();
  }

  return NextResponse.next();
}

function isAuthorized(header: string | null, password: string) {
  if (!header?.startsWith("Basic ")) return false;

  try {
    const decoded = atob(header.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 0) return false;

    return decoded.slice(separatorIndex + 1) === password;
  } catch {
    return false;
  }
}

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Bobros Game Preview", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  matcher: ["/game/:path*", "/api/run/:path*", "/api/score/:path*", "/api/leaderboard/:path*"],
};
