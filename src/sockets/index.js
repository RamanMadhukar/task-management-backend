const jwt = require('jsonwebtoken')
const User = require('../models/User')
const logger = require('../utils/logger')

// Socket event constants (mirrors frontend)
const EVENTS = {
    TASK_CREATED: 'task:created',
    TASK_UPDATED: 'task:updated',
    TASK_DELETED: 'task:deleted',
    TASK_ASSIGNED: 'task:assigned',
    JOIN_ROOM: 'room:join',
    LEAVE_ROOM: 'room:leave',
    NOTIFICATION: 'notification',
}

let io = null

/**
 * Initialize Socket.io with the HTTP server.
 * Call this once from server.js after createServer.
 */
const initSocket = (httpServer) => {
    const { Server } = require('socket.io')

    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    })

    // ── Auth middleware ─────────────────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.split(' ')[1]

            if (!token) return next(new Error('Authentication required'))

            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const user = await User.findById(decoded.id).select('-password').lean()

            if (!user) return next(new Error('User not found'))

            socket.user = user
            next()
        } catch (err) {
            next(new Error('Invalid token'))
        }
    })

    // ── Connection handler ──────────────────────────────────
    io.on('connection', (socket) => {
        const { _id, name, role } = socket.user
        logger.info(`[Socket] Connected: ${name} (${_id}) | id: ${socket.id}`)

        // Auto-join personal room so targeted notifications work
        socket.join(`user:${_id}`)
        if (role === 'admin') socket.join('admin:room')

        // Manual room join (e.g. project rooms in future)
        socket.on(EVENTS.JOIN_ROOM, (room) => {
            socket.join(room)
            logger.debug(`[Socket] ${name} joined room: ${room}`)
        })

        socket.on(EVENTS.LEAVE_ROOM, (room) => {
            socket.leave(room)
            logger.debug(`[Socket] ${name} left room: ${room}`)
        })

        socket.on('disconnect', (reason) => {
            logger.info(`[Socket] Disconnected: ${name} | reason: ${reason}`)
        })

        socket.on('error', (err) => {
            logger.error(`[Socket] Error for ${name}: ${err.message}`)
        })
    })

    logger.info('[Socket] Server initialized')
    return io
}

/**
 * Get the io instance (call after initSocket).
 */
const getIO = () => {
    if (!io) throw new Error('Socket.io not initialized — call initSocket first')
    return io
}

/**
 * Emit task:created to all connected clients.
 * Admins see all; regular users only see their own.
 */
const emitTaskCreated = (task) => {
    if (!io) return
    // Broadcast to admin room
    io.to('admin:room').emit(EVENTS.TASK_CREATED, task)
    // Notify assignee directly if they're not an admin
    if (task.assignee?._id) {
        io.to(`user:${task.assignee._id}`).emit(EVENTS.TASK_CREATED, task)
    }
}

/**
 * Emit task:updated — notify assignee + admins.
 */
const emitTaskUpdated = (task) => {
    if (!io) return
    io.to('admin:room').emit(EVENTS.TASK_UPDATED, task)
    if (task.assignee?._id) {
        io.to(`user:${task.assignee._id}`).emit(EVENTS.TASK_UPDATED, task)
    }
}

/**
 * Emit task:deleted — notify all admins.
 */
const emitTaskDeleted = (taskId) => {
    if (!io) return
    io.to('admin:room').emit(EVENTS.TASK_DELETED, { id: taskId })
}

/**
 * Emit task:assigned — targeted notification to the newly assigned user.
 */
const emitTaskAssigned = (task, assigneeId) => {
    if (!io) return
    io.to(`user:${assigneeId}`).emit(EVENTS.TASK_ASSIGNED, { task })
}

/**
 * Broadcast a generic notification to a specific user.
 */
const sendNotification = (userId, notification) => {
    if (!io) return
    io.to(`user:${userId}`).emit(EVENTS.NOTIFICATION, {
        id: Date.now(),
        read: false,
        createdAt: new Date().toISOString(),
        ...notification,
    })
}

module.exports = {
    initSocket,
    getIO,
    emitTaskCreated,
    emitTaskUpdated,
    emitTaskDeleted,
    emitTaskAssigned,
    sendNotification,
    EVENTS,
}