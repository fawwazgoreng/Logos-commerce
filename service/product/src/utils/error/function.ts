import { ZodError } from "zod";
import { HTTPException } from "hono/http-exception";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from ".";
import { PrismaClientKnownRequestError } from "../../infrastructure/database/generated/prisma/runtime/client";

export function mapToAppError(error: any): AppError {
  if (error instanceof ZodError) {
    return new AppError(
      error.issues[0].message,
      422,
      "VALIDATION_ERROR",
      error.flatten
    );
  }

  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return new AppError("Record not found", 404, "NOT_FOUND");
    }

    return new AppError(error.message, 400, error.code);
  }

  if (error instanceof AppError) {
    return error;
  }

  return new AppError("Internal server error", 500, "INTERNAL_ERROR");
}

export function ErrorHTTPException(error: AppError): HTTPException {
  return new HTTPException(error.statusCode as ContentfulStatusCode, {
    message: error.message,
    res: new Response(
      JSON.stringify({
        status: error.statusCode,
        message: error.message,
        error: error.errorCode,
        details: error.details ?? null,
      }),
      {
        status: error.statusCode,
        headers: { "Content-Type": "application/json" },
      }
    ),
  });
}

export function toHttpError(error: unknown) {
  const appError = mapToAppError(error);
  return ErrorHTTPException(appError);
}

// Centralized error mapping for Zod and internal errors
export const handleError = (error: any) => {
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

export const baseHandleError = (error: any) => {
    return {
        status: error.status || 500,
        message: error.message || "Internal server error",
        error: error.error || "Internal server error",
    };
}
