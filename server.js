require('dotenv').config()
const http = require('http')
const app = require('./src/app')
const connectDB = require('./src/config/db')
const { initSocket } = require('./src/sockets')
const logger = require('./src/utils/logger')

const PORT = process.env.PORT || 5000

const start = async () => {
    // Connect to MongoDB first
    await connectDB()

    // Create HTTP server from Express app
    const httpServer = http.createServer(app)

    // Attach Socket.io to the same HTTP server
    initSocket(httpServer)

    httpServer.listen(PORT, () => {
        logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`)
        logger.info(`Socket.io listening on same port`)
    })
}

process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`)
    process.exit(1)
})

process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`)
    process.exit(1)
})

start()