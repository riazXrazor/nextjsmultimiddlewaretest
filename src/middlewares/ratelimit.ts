import { type NextRequest, NextResponse } from "next/server";

import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

const ratelimit = new Ratelimit({
	redis: kv,
	// 100 requests from the same IP in 5 seconds
	limiter: Ratelimit.slidingWindow(100, "5 s"),
});

// Define which routes you want to rate limit
// export const config = {
// 	matcher: "/",
// };
const rateLimitMap = new Map();
export async function RatelimitMiddleware(request: NextRequest) {
	const newHeaders = new Headers(request.headers);
	console.log("RatelimitMiddleware");
	// You could alternatively limit based on user ID or similar
	const responseSchema = {
		msg: "",
		success: true,
		status: 200,
	};
	if (
		!request.nextUrl.pathname.startsWith("/_next") &&
		!request.nextUrl.pathname.endsWith(".ico")
	) {
		// console.log("---ratelimit", request.nextUrl.pathname);
		const ip = request.ip ?? "127.0.0.1";

		const limit = 100; // Limiting requests to 100 per 5s per IP
		const windowMs = 5 * 1000; // 2 seconds

		if (!rateLimitMap.has(ip)) {
			rateLimitMap.set(ip, {
				count: 0,
				lastReset: Date.now(),
			});
		}

		const ipData = rateLimitMap.get(ip);
		const remaining = limit - ipData.count;
		const timeremaining = Date.now() - ipData.lastReset;

		if (timeremaining > windowMs) {
			ipData.count = 0;
			ipData.lastReset = Date.now();
		}

		newHeaders.set("x-ratelimit-limit", String(limit));
		newHeaders.set("x-ratelimit-remaining", String(remaining));
		newHeaders.set("x-ratelimit-reset", String(timeremaining / 1000));

		if (ipData.count >= limit) {
			const responseSchema = {
				msg: "Too many requests",
				success: false,
				status: 429,
			};
			return new Response(JSON.stringify(responseSchema), {
				status: responseSchema.status,
				headers: newHeaders,
			});
		}

		ipData.count += 1;
	}

	return NextResponse.next({
		headers: newHeaders,
	});
}
