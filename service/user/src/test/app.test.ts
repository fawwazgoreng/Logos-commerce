import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test";
import app from "..";

// ---------------------------------------------------------------------------
// Mock heavy dependencies so tests run without real DB / external services
// ---------------------------------------------------------------------------

// --- Prisma ---
mock.module("./infrastructure/database/prisma", () => ({
    default: {
        $queryRaw: mock(() => Promise.resolve([{ 1: 1 }])),
    },
}));

// --- UserRead ---
mock.module("./user/user.read", () => ({
    default: class MockUserRead {
        login = mock(async (body: any) => {
            if (body?.email === "valid@test.com" && body?.password === "secret") {
                return {
                    user: { id: "user-1", email: "valid@test.com", role: "USER" },
                    token: "mock-refresh-token",
                };
            }
            const err: any = new Error("Invalid credentials");
            err.status = 401;
            err.error = "INVALID_CREDENTIALS";
            throw err;
        });

        refresh = mock(async (token: string) => {
            if (token === "mock-refresh-token") {
                return { id: "user-1", email: "valid@test.com", role: "USER" };
            }
            const err: any = new Error("Invalid refresh token");
            err.status = 401;
            err.error = "INVALID_TOKEN";
            throw err;
        });
    },
}));

// --- UserWrite ---
mock.module("./user/user.write", () => ({
    default: class MockUserWrite {
        register = mock(async (body: any) => {
            if (!body?.email || !body?.password) {
                const err: any = new Error("Validation failed");
                err.status = 400;
                err.error = "VALIDATION_ERROR";
                throw err;
            }
            return { id: "new-user-1", email: body.email };
        });

        verify = mock(async (_userId: string) => undefined);

        uploadPhotoProfile = mock(async (_payload: any) =>
            "https://cdn.example.com/photo.jpg",
        );

        editPhotoProfile = mock(async (_payload: any) =>
            "https://cdn.example.com/photo-edited.jpg",
        );

        deletePhotoProfile = mock(async (_userId: string) => null);
    },
}));

// --- EmailRead ---
mock.module("./email/email.read.", () => ({
    default: class MockEmailRead {
        verify = mock(async (body: any) => {
            if (body?.code === "123456") return "new-user-1";
            const err: any = new Error("Invalid verification code");
            err.status = 400;
            err.error = "INVALID_CODE";
            throw err;
        });
    },
}));

// --- EmailWrite ---
mock.module("./email/email.write", () => ({
    default: class MockEmailWrite {
        create = mock(async (_userId: string, _email: string) => undefined);
    },
}));

// --- Auth utilities ---
mock.module("./utils/auth/auth", () => ({
    buildAccessToken: mock((_user: any) => "mock-access-token"),
    verifyJwt: mock(async (header: string) => {
        if (!header.startsWith("Bearer valid-")) {
            const err: any = new Error("Invalid token");
            err.status = 401;
            throw err;
        }
        return { id: "user-1", email: "valid@test.com" };
    }),
}));

// --- Config env ---
mock.module("./config", () => ({
    env: {
        FRONT_URL: "http://localhost:3000",
        JWT_SECRET: "test-secret",
    },
}));

// ---------------------------------------------------------------------------
// Helper — execute a Request against the Hono app
// ---------------------------------------------------------------------------
async function req(
    method: string,
    path: string,
    opts: {
        body?: Record<string, any>;
        headers?: Record<string, string>;
        cookies?: Record<string, string>;
    } = {},
) {
    const url = `http://localhost${path}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        ...(opts.headers ?? {}),
    };

    if (opts.cookies) {
        headers["Cookie"] = Object.entries(opts.cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join("; ");
    }

    const init: RequestInit = { method, headers };
    if (opts.body) init.body = JSON.stringify(opts.body);

    return app.fetch(new Request(url, init));
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

// ── 1. Public Routes ────────────────────────────────────────────────────────

describe("GET /auth/", () => {
    it("returns plain text service-running message", async () => {
        const res = await req("GET", "/auth/");
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("Auth service is running");
    });
});

describe("GET /auth/health", () => {
    it("returns 200 when DB is reachable", async () => {
        const res = await req("GET", "/auth/health");
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.status).toBe(200);
        expect(json.message).toBe("Server healthy");
    });

    it("returns 503 when DB throws", async () => {
        // Override prisma mock to throw
        const prisma = (await import("../infrastructure/database/prisma"))
            .default as any;
        const original = prisma.$queryRaw;
        prisma.$queryRaw = mock(() =>
            Promise.reject(new Error("Connection refused")),
        );

        const res = await req("GET", "/auth/health");
        expect(res.status).toBe(503);

        // Restore
        prisma.$queryRaw = original;
    });
});

// ── 2. POST /auth/login ──────────────────────────────────────────────────────

describe("POST /auth/login", () => {
    it("returns 200 with access_token on valid credentials", async () => {
        const res = await req("POST", "/auth/login", {
            body: { email: "valid@test.com", password: "secret" },
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.status).toBe(200);
        expect(json.message).toBe("Login successful");
        expect(json.access_token).toBe("mock-access-token");
    });

    it("sets httpOnly refresh-token cookie on successful login", async () => {
        const res = await req("POST", "/auth/login", {
            body: { email: "valid@test.com", password: "secret" },
        });

        const setCookieHeader = res.headers.get("set-cookie") ?? "";
        expect(setCookieHeader).toContain("refresh-token=");
        expect(setCookieHeader.toLowerCase()).toContain("httponly");
    });

    it("returns 401 on invalid credentials", async () => {
        const res = await req("POST", "/auth/login", {
            body: { email: "wrong@test.com", password: "bad" },
        });

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.status).toBe(401);
    });

    it("handles malformed JSON body gracefully (non-2xx)", async () => {
        const res = await app.fetch(
            new Request("http://localhost/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Origin: "http://localhost:3000",
                },
                body: "not-json",
            }),
        );

        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});

// ── 3. GET /auth/refresh ─────────────────────────────────────────────────────

describe("GET /auth/refresh", () => {
    it("returns 200 with new access_token when cookie is valid", async () => {
        const res = await req("GET", "/auth/refresh", {
            cookies: { "refresh-token": "mock-refresh-token" },
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.access_token).toBe("mock-access-token");
        expect(json.message).toBe("Token refreshed successfully");
    });

    it("returns 401 when refresh token is invalid or missing", async () => {
        const res = await req("GET", "/auth/refresh", {
            cookies: { "refresh-token": "bad-token" },
        });

        expect(res.status).toBe(401);
    });
});

// ── 4. POST /auth/register ────────────────────────────────────────────────────

describe("POST /auth/register", () => {
    it("returns 201 on successful registration", async () => {
        const res = await req("POST", "/auth/register", {
            body: { email: "newuser@test.com", password: "StrongPass123!" },
        });

        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.status).toBe(201);
        expect(json.message).toContain("Verification code sent");
        expect(json.user.email).toBe("newuser@test.com");
    });

    it("returns 400 when required fields are missing", async () => {
        const res = await req("POST", "/auth/register", {
            body: {},
        });

        expect(res.status).toBe(400);
    });
});

// ── 5. POST /auth/verify ──────────────────────────────────────────────────────

describe("POST /auth/verify", () => {
    it("returns 200 on valid verification code", async () => {
        const res = await req("POST", "/auth/verify", {
            body: { code: "123456" },
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.status).toBe(200);
        expect(json.message).toContain("success verify");
    });

    it("returns 400 on invalid verification code", async () => {
        const res = await req("POST", "/auth/verify", {
            body: { code: "000000" },
        });

        expect(res.status).toBe(400);
    });
});

// ── 6. Profile Routes (public — no JWT guard before them) ───────────────────

describe("POST /auth/profile", () => {
    it("returns 201 when photo uploaded successfully", async () => {
        const formData = new FormData();
        formData.append("user_id", "user-1");
        formData.append(
            "image",
            new File(["fake-image-bytes"], "avatar.png", { type: "image/png" }),
        );

        const res = await app.fetch(
            new Request("http://localhost/auth/profile", {
                method: "POST",
                headers: { Origin: "http://localhost:3000" },
                body: formData,
            }),
        );

        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.url).toContain("cdn.example.com");
    });
});

describe("PUT /auth/profile", () => {
    it("returns 200 when photo edited successfully", async () => {
        const formData = new FormData();
        formData.append("user_id", "user-1");
        formData.append(
            "image",
            new File(["fake-bytes"], "new-avatar.png", { type: "image/png" }),
        );

        const res = await app.fetch(
            new Request("http://localhost/auth/profile", {
                method: "PUT",
                headers: { Origin: "http://localhost:3000" },
                body: formData,
            }),
        );

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.url).toContain("cdn.example.com");
    });
});

describe("DELETE /auth/profile", () => {
    it("returns 201 after deleting photo profile", async () => {
        const formData = new FormData();
        formData.append("user_id", "user-1");

        const res = await app.fetch(
            new Request("http://localhost/auth/profile", {
                method: "DELETE",
                headers: { Origin: "http://localhost:3000" },
                body: formData,
            }),
        );

        expect(res.status).toBe(201);
    });
});

// ── 7. JWT Auth Middleware ────────────────────────────────────────────────────

describe("Auth Middleware (JWT guard)", () => {
    it("returns 401 when Authorization header is absent", async () => {
        // /logout is behind the JWT guard
        const res = await req("DELETE", "/auth/logout");
        expect(res.status).toBe(401);
    });

    it("returns 401 when Authorization header has an invalid token", async () => {
        const res = await req("DELETE", "/auth/logout", {
            headers: { Authorization: "Bearer invalid-token" },
        });
        expect(res.status).toBe(401);
    });

    it("passes through when Authorization header is valid", async () => {
        const res = await req("DELETE", "/auth/logout", {
            headers: { Authorization: "Bearer valid-jwt" },
        });
        // valid-jwt triggers verifyJwt mock to pass (starts with "Bearer valid-")
        expect(res.status).toBe(200);
    });
});

// ── 8. DELETE /auth/logout ────────────────────────────────────────────────────

describe("DELETE /auth/logout", () => {
    it("clears refresh-token cookie and returns 200", async () => {
        const res = await req("DELETE", "/auth/logout", {
            headers: { Authorization: "Bearer valid-jwt" },
            cookies: { "refresh-token": "mock-refresh-token" },
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("Logout successful");

        // Cookie should be cleared (max-age=0 or expired date)
        const setCookieHeader = res.headers.get("set-cookie") ?? "";
        if (setCookieHeader) {
            const isCleared =
                setCookieHeader.includes("refresh-token=;") ||
                setCookieHeader.includes("Max-Age=0") ||
                setCookieHeader.includes("Expires=Thu, 01 Jan 1970");
            expect(isCleared).toBe(true);
        }
    });
});

// ── 9. Global Error Handler ───────────────────────────────────────────────────

describe("Global Error Handler", () => {
    it("returns correct error shape for HTTPException", async () => {
        // Force 401 from an unprotected route by hitting logout without token
        const res = await req("DELETE", "/auth/logout");
        const json = await res.json();

        expect(json).toHaveProperty("status");
        expect(json).toHaveProperty("message");
        expect(res.status).toBe(401);
    });

    it("includes CORS headers even on error responses", async () => {
        const res = await req("DELETE", "/auth/logout");
        // CORS headers set by error handler
        const acao = res.headers.get("Access-Control-Allow-Origin");
        expect(acao).toBeTruthy();
    });
});

// ── 10. 404 Not Found ─────────────────────────────────────────────────────────

describe("404 Not Found", () => {
    it("returns standardized 404 JSON for unknown routes", async () => {
        const res = await req("GET", "/auth/nonexistent-route-xyz");
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.status).toBe(404);
        expect(json.message).toContain("Route not found");
    });

    it("includes the HTTP method and path in 404 message", async () => {
        const res = await req("POST", "/auth/does-not-exist");
        const json = await res.json();
        expect(json.message).toContain("POST");
        expect(json.message).toContain("/auth/does-not-exist");
    });
});

// ── 11. Response Structure Contracts ─────────────────────────────────────────

describe("Response Structure Contracts", () => {
    it("login response always contains status, message, access_token keys", async () => {
        const res = await req("POST", "/auth/login", {
            body: { email: "valid@test.com", password: "secret" },
        });
        const json = await res.json();
        expect(json).toHaveProperty("status");
        expect(json).toHaveProperty("message");
        expect(json).toHaveProperty("access_token");
    });

    it("register response always contains status, message, user keys", async () => {
        const res = await req("POST", "/auth/register", {
            body: { email: "new@example.com", password: "pass123" },
        });
        const json = await res.json();
        expect(json).toHaveProperty("status");
        expect(json).toHaveProperty("message");
        expect(json).toHaveProperty("user");
    });

    it("refresh response always contains access_token key", async () => {
        const res = await req("GET", "/auth/refresh", {
            cookies: { "refresh-token": "mock-refresh-token" },
        });
        const json = await res.json();
        expect(json).toHaveProperty("access_token");
    });
});