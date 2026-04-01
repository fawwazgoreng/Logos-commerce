import { ZodError } from "zod";
import { PrismaClientKnownRequestError } from "../infrastructure/database/generated/prisma/runtime/client";
import { HTTPException } from "hono/http-exception";
import { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: string;

    constructor(message: string, statusCode: number, errorCode: string) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }

    PrismaHandle = (error: any, notFoundMsg: string = "Record not found") => {
        if (error instanceof PrismaClientKnownRequestError) {
            const isNotFound = error.code === "P2025";
            return {
                status: isNotFound ? 404 : 400,
                message: isNotFound ? notFoundMsg : error.message,
                error: `${error.code} ${error.cause ?? ""}`,
            };
        }

        // Return current error if it has a status, otherwise return 500
        return error.status
            ? error
            : {
                  status: 500,
                  message: "Internal server error",
                  error: error.message,
              };
    };

    // Centralized error mapping for Zod and internal errors
    handleError = (error: any) => {
        if (error instanceof ZodError) {
            return {
                status: 422,
                message: error.issues[0].message,
                error: error.cause,
            };
        }
        return {
            status: error.status || 500,
            message: error.message || "Internal server error",
            error: error.error || "Internal server error",
        };
    };

    /** Standardizes error objects for consistent API responses using HTTPException */
    buildAppError = (error: any): HTTPException => {
        const status = (error?.status || 500) as StatusCode;
        const body = JSON.stringify({
            status,
            message: error?.message || "Internal server error",
            error: error?.error ?? null,
        });

        return new HTTPException(status as ContentfulStatusCode, {
            message: error?.message || "Internal server error",
            res: new Response(body, {
                status,
                headers: { "Content-Type": "application/json" },
            }),
        });
    };
}
