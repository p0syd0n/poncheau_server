import net from 'net';

// Create TCP server
const server = net.createServer((socket) => {
    console.log('New client connected');

    socket.on('data', (data) => {
        console.log(`Received data: ${data}`);
    });

    socket.on('end', () => {
        console.log('Client disconnected');
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
});

const port = 8069;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
