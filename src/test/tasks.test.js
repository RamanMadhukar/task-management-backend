const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../src/app')

let userToken
let adminToken
let taskId
let userId

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/taskflow_test2')

    // Create regular user
    const userRes = await request(app).post('/api/auth/register').send({
        name: 'Task User', email: 'taskuser@test.com', password: 'password123', role: 'user',
    })
    userToken = userRes.body.token
    userId = userRes.body.user.id

    // Create admin
    const adminRes = await request(app).post('/api/auth/register').send({
        name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin',
    })
    adminToken = adminRes.body.token
})

afterAll(async () => {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
})

describe('POST /api/tasks', () => {
    it('creates a task for authenticated user', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                title: 'My First Task',
                priority: 'high',
                status: 'todo',
            })

        expect(res.statusCode).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.data.title).toBe('My First Task')
        taskId = res.body.data._id
    })

    it('rejects task creation without authentication', async () => {
        const res = await request(app).post('/api/tasks').send({ title: 'No Auth Task' })
        expect(res.statusCode).toBe(401)
    })

    it('rejects task with missing title', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ priority: 'high' })
        expect(res.statusCode).toBe(400)
    })

    it('sets createdBy to current user', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ title: 'Ownership Task', priority: 'low' })
        expect(res.body.data.createdBy).toBeDefined()
    })
})

describe('GET /api/tasks', () => {
    it('returns paginated tasks for authenticated user', async () => {
        const res = await request(app)
            .get('/api/tasks')
            .set('Authorization', `Bearer ${userToken}`)

        expect(res.statusCode).toBe(200)
        expect(res.body.success).toBe(true)
        expect(Array.isArray(res.body.data)).toBe(true)
        expect(res.body.pagination).toHaveProperty('total')
        expect(res.body.pagination).toHaveProperty('page')
    })

    it('supports status filter', async () => {
        const res = await request(app)
            .get('/api/tasks?status=todo')
            .set('Authorization', `Bearer ${userToken}`)

        expect(res.statusCode).toBe(200)
        res.body.data.forEach((task) => expect(task.status).toBe('todo'))
    })

    it('supports search filter', async () => {
        const res = await request(app)
            .get('/api/tasks?search=First')
            .set('Authorization', `Bearer ${userToken}`)

        expect(res.statusCode).toBe(200)
        expect(res.body.data.some((t) => t.title.includes('First'))).toBe(true)
    })

    it('returns 401 without token', async () => {
        const res = await request(app).get('/api/tasks')
        expect(res.statusCode).toBe(401)
    })
})

describe('PUT /api/tasks/:id', () => {
    it('updates a task the user owns', async () => {
        const res = await request(app)
            .put(`/api/tasks/${taskId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ status: 'in-progress', title: 'Updated Task' })

        expect(res.statusCode).toBe(200)
        expect(res.body.data.status).toBe('in-progress')
        expect(res.body.data.title).toBe('Updated Task')
    })

    it('returns 404 for non-existent task', async () => {
        const fakeId = new mongoose.Types.ObjectId()
        const res = await request(app)
            .put(`/api/tasks/${fakeId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ status: 'done' })
        expect(res.statusCode).toBe(404)
    })

    it('admin can update any task', async () => {
        const res = await request(app)
            .put(`/api/tasks/${taskId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ priority: 'critical' })

        expect(res.statusCode).toBe(200)
        expect(res.body.data.priority).toBe('critical')
    })
})

describe('DELETE /api/tasks/:id', () => {
    it('deletes a task the user owns', async () => {
        const res = await request(app)
            .delete(`/api/tasks/${taskId}`)
            .set('Authorization', `Bearer ${userToken}`)

        expect(res.statusCode).toBe(200)
        expect(res.body.success).toBe(true)
    })

    it('returns 404 after deletion', async () => {
        const res = await request(app)
            .delete(`/api/tasks/${taskId}`)
            .set('Authorization', `Bearer ${userToken}`)

        expect(res.statusCode).toBe(404)
    })
})

describe('GET /api/tasks/stats/summary', () => {
    it('returns aggregated task stats', async () => {
        // Create a task first so stats are non-empty
        await request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ title: 'Stats Task', status: 'done', priority: 'low' })

        const res = await request(app)
            .get('/api/tasks/stats/summary')
            .set('Authorization', `Bearer ${userToken}`)

        expect(res.statusCode).toBe(200)
        expect(Array.isArray(res.body.data)).toBe(true)
        res.body.data.forEach((s) => {
            expect(s).toHaveProperty('status')
            expect(s).toHaveProperty('count')
        })
    })
})