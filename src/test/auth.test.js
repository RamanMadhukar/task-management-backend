const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../src/app')

const TEST_USER = {
    name: 'Test User',
    email: 'test@taskflow.dev',
    password: 'password123',
    role: 'user',
}

let authToken

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/taskflow_test')
})

afterAll(async () => {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
})

describe('POST /api/auth/register', () => {
    it('registers a new user and returns token', async () => {
        const res = await request(app).post('/api/auth/register').send(TEST_USER)

        expect(res.statusCode).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body).toHaveProperty('token')
        expect(res.body.user.email).toBe(TEST_USER.email)
        expect(res.body.user).not.toHaveProperty('password')
    })

    it('rejects duplicate email registration', async () => {
        const res = await request(app).post('/api/auth/register').send(TEST_USER)
        expect(res.statusCode).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('rejects registration with missing required fields', async () => {
        const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' })
        expect(res.statusCode).toBe(400)
    })

    it('rejects password shorter than 6 characters', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Test', email: 'short@test.com', password: '123',
        })
        expect(res.statusCode).toBe(400)
    })
})

describe('POST /api/auth/login', () => {
    it('returns token on valid credentials', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: TEST_USER.email,
            password: TEST_USER.password,
        })

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('token')
        authToken = res.body.token
    })

    it('rejects wrong password', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: TEST_USER.email,
            password: 'wrongpassword',
        })
        expect(res.statusCode).toBe(401)
        expect(res.body.success).toBe(false)
    })

    it('rejects non-existent email', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'ghost@test.com',
            password: 'anypassword',
        })
        expect(res.statusCode).toBe(401)
    })

    it('rejects request with no body', async () => {
        const res = await request(app).post('/api/auth/login').send({})
        expect(res.statusCode).toBe(400)
    })
})

describe('GET /api/auth/me', () => {
    it('returns current user when authenticated', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${authToken}`)

        expect(res.statusCode).toBe(200)
        expect(res.body.user.email).toBe(TEST_USER.email)
    })

    it('returns 401 without token', async () => {
        const res = await request(app).get('/api/auth/me')
        expect(res.statusCode).toBe(401)
    })

    it('returns 401 with invalid token', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer invalid.token.here')
        expect(res.statusCode).toBe(401)
    })
})