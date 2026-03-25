import { Context, Hono } from 'hono'
import { StatusCode } from 'hono/utils/http-status'
import prisma from './infrastructure/database/prisma'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health' , async (c) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return c.json({
            message: "server healthy"
        })
    } catch (error : any) {
        throw {
            error 
        }
    }
})

app.post('/login' , async (c) => {
    
});

app.delete('logout' , (c) => {
    try {
        
    } catch (error) {
        throw {
            error
        }
    }
})

app.onError((error: any, c: Context) => {
    const res = {
        status: error.status || 500,
        message: error.message || "internal server error",
        error: error.error || "internal server error"
    };
    c.status(res.status as StatusCode);
    return c.json(res);
});

export default app
