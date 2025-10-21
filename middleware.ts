import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
    // Added publicRoutes array for stripe to clerk communication on new subs
    publicRoutes: [
        "/api/webhooks/stripe",
    ]
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
