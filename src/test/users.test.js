const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../src/app')

let adminToken
let userToken
let targetUserId

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/taskflow_test3')

    const adminRes = await request(app).post('/api/auth/register').send({
        name: 'Admin', email: 'admin@users.test', password: 'password123', role: 'admin',
    })
    adminToken = adminRes.body.token

    const userRes = await request(app).post('/api/auth/register').send({
        name: 'Target User', email: 'target@users.test', password: 'password123', role: 'user',
    })
    userToken = userRes.body.token
    targetUserId = userRes.body.user.id
})

afterAll(async () => {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
})

describe('GET /api/users — admin only', () => {
    it('admin can list all users', async () => {
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.statusCode).toBe(200)
        expect(Array.isArray(res.body.data)).toBe(true)
        expect(res.body.data.length).toBeGreaterThanOrEqual(2)
        // Passwords must never be returned
        res.body.data.forEach((u) => expect(u).not.toHaveProperty('password'))
    })

    it('regular user cannot list all users', async () => {
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${userToken}`)

        expect(res.statusCode).toBe(403)
    })

    it('unauthenticated request returns 401', async () => {
        const res = await request(app).get('/api/users')
        expect(res.statusCode).toBe(401)
    })
})

describe('GET /api/users/:id', () => {
    it('admin can get user by id', async () => {
        const res = await request(app)
            .get(`/api/users/${targetUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.statusCode).toBe(200)
        expect(res.body.data.email).toBe('target@users.test')
    })

    it('returns 404 for non-existent user', async () => {
        const fakeId = new mongoose.Types.ObjectId()
        const res = await request(app)
            .get(`/api/users/${fakeId}`)
            .set('Authorization', `Bearer ${adminToken}`)
        expect(res.statusCode).toBe(404)
    })
})

describe('PATCH /api/users/:id/role', () => {
    it('admin can promote user to admin', async () => {
        const res = await request(app)
            .patch(`/api/users/${targetUserId}/role`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'admin' })

        expect(res.statusCode).toBe(200)
        expect(res.body.data.role).toBe('admin')
    })

    it('admin can demote admin back to user', async () => {
        const res = await request(app)
            .patch(`/api/users/${targetUserId}/role`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'user' })

        expect(res.statusCode).toBe(200)
        expect(res.body.data.role).toBe('user')
    })

    it('rejects invalid role value', async () => {
        const res = await request(app)
            .patch(`/api/users/${targetUserId}/role`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'superuser' })

        expect(res.statusCode).toBe(400)
    })

    it('regular user cannot change roles', async () => {
        const res = await request(app)
            .patch(`/api/users/${targetUserId}/role`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ role: 'admin' })
        expect(res.statusCode).toBe(403)
    })
})

describe('DELETE /api/users/:id', () => {
    it('regular user cannot delete other users', async () => {
        const res = await request(app)
            .delete(`/api/users/${targetUserId}`)
            .set('Authorization', `Bearer ${userToken}`)
        expect(res.statusCode).toBe(403)
    })

    it('admin can delete a user', async () => {
        const res = await request(app)
            .delete(`/api/users/${targetUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(res.statusCode).toBe(200)
        expect(res.body.success).toBe(true)
    })

    it('deleted user no longer accessible', async () => {
        const res = await request(app)
            .get(`/api/users/${targetUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
        expect(res.statusCode).toBe(404)
    })
})