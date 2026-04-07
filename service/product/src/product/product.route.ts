import { Hono } from "hono";
import { handleError } from "../utils/error/function";

const product = new Hono();

product
    .get("/", async (c) => {
        try {
        } catch (error: any) {
            throw handleError(error);
        }
    })
    .get("/:id", async (c) => {
        try {
            const id = c.req.param("id");
        } catch (error: any) {
            throw handleError(error);
        }
    })
    .post("/", async (c) => {
        try {
        } catch (error: any) {
            throw handleError(error);
        }
    })
    .delete("/", async (c) => {
        try {
        } catch (error: any) {
            throw handleError(error);
        }
    })
    .put("/", async (c) => {
        try {
        } catch (error: any) {
            throw handleError(error);
        }
    });

export default product;
