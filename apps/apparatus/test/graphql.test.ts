import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GraphQL Endpoint', () => {
    it('should handle basic query', async () => {
        const query = `
            query {
                echo(message: "test") {
                    message
                    depth
                }
            }
        `;
        const response = await request(app)
            .post('/graphql')
            .send({ query });
        
        expect(response.status).toBe(200);
        expect(response.body.data.echo.message).toBe('test');
        expect(response.body.data.echo.depth).toBe(1);
    });

    it('should handle recursive query', async () => {
        const query = `
            query {
                echo {
                    next {
                        depth
                        next {
                            depth
                        }
                    }
                }
            }
        `;
        const response = await request(app)
            .post('/graphql')
            .send({ query });
        
        expect(response.status).toBe(200);
        expect(response.body.data.echo.next.depth).toBe(2);
        expect(response.body.data.echo.next.next.depth).toBe(3);
    });
});
