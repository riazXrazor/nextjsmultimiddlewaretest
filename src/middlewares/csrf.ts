import { CsrfError, createCsrfProtect } from "@edge-csrf/nextjs";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// initalize csrf protection method
const csrfProtect = createCsrfProtect({
	cookie: {
		secure: process.env.NODE_ENV === "production",
	},
});

// Next.js middleware function
export const csrfMiddleware = async (request: NextRequest) => {
	const newHeaders = new Headers(request.headers);
	console.log("csrfMiddleware");
	const response = NextResponse.next({
		headers: newHeaders,
	});
	try {
		await csrfProtect(request, response);
	} catch (err) {
		if (err instanceof CsrfError) {
			const responseSchema = {
				msg: "invalid csrf token",
				success: false,
				status: 403,
			};

			return new NextResponse(JSON.stringify(responseSchema), {
				status: responseSchema.status,
			});
		}
		throw err;
	}

	return response;
};
